/**
 * Outlets, against the real API.
 *
 * This is also where the language boundary sits. The backend speaks English and
 * matches its own schema; the UI domain model is Indonesian (`kode`, `kecamatan`,
 * `penanggungJawab`). Mapping here rather than renaming either side keeps the
 * backend consistent with its published contract and leaves every component
 * untouched — the direction technical-gaps 2.4 chose.
 *
 * # The phone arrives decrypted, and must not be logged
 *
 * `core.outlets.phone_encrypted` is AES-256-GCM at rest and reaches this
 * adapter in clear. It is put on the domain object and nowhere else: no
 * console.log of a response, no error message quoting one, no analytics event.
 * The encryption is worth nothing if the plaintext is copied into a log the
 * same people can read.
 *
 * It is also why the list has no phone search. A random nonce means two
 * encryptions of the same number differ, which rules out LIKE and equality
 * alike — the server's SearchableColumns say so, and asking anyway is a 422
 * rather than an empty result that looks like "no such outlet".
 */
import { getList, getOne, send } from "@/lib/api";
import { exportCsv, timestampSuffix } from "@/lib/export";
import { outletLabel } from "@/lib/lexicon";
import type { OutletEntity, OutletStatus } from "@/mocks/types";
import type { OutletApi, OutletFilters, OutletView } from "./contract";

/** Mirrors the backend's OutletResponse. */
interface OutletResponse {
  id: string;
  branch_id: string;
  code: string;
  name: string;
  owner_name: string;
  phone: string;
  npwp?: string;
  email?: string;
  address: string;
  district?: string;
  city: string;
  province: string;
  latitude?: number;
  longitude?: number;
  license_expires_at?: string;
  credit_limit: number;
  credit_balance: number;
  payment_terms_days: number;
  auto_block_on_overdue: boolean;
  current_month_target_qty: number;
  service_tier: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** 100 is every list definition's MaxPageSize; the server refuses more. */
const PAGE_SIZE = 100;

/**
 * The schema's three-letter audit flag mapped onto the console's two words.
 *
 * `del` never arrives — the base query filters soft-deleted rows — so it is
 * deliberately absent rather than given a word nobody can reach.
 */
const STATUS_TO_DOMAIN: Record<string, OutletStatus> = {
  atv: "Aktif",
  ina: "Nonaktif",
};

function toStatus(wire: string): OutletStatus {
  return STATUS_TO_DOMAIN[wire] ?? "Nonaktif";
}

function toWireStatus(status?: OutletStatus): string | undefined {
  if (!status) return undefined;
  return status === "Aktif" ? "atv" : "ina";
}

function toView(row: OutletResponse): OutletView {
  return {
    id: row.id,
    // The scope the mock store partitions itself by. The API build has no need
    // of it -- row-level security decides what this session can see, on the
    // server, and a client-side tenant filter would be a second opinion that
    // can only ever be wrong. Empty rather than invented, and nothing on the
    // API path reads it.
    tenantId: "",
    branchId: row.branch_id,
    kode: row.code,
    nama: row.name,
    alamat: row.address,
    kecamatan: row.district ?? "—",
    kota: row.city,
    // ST_MakePoint takes longitude first and every mapping API says "lat, lng".
    // Both are read by name here rather than by position, which is the one
    // thing that stops an outlet in Central Java appearing off the coast of
    // Somalia. Absent coordinates are 0, which the map treats as unplaced.
    lat: row.latitude ?? 0,
    lng: row.longitude ?? 0,
    penanggungJawab: row.owner_name,
    telepon: row.phone,
    status: toStatus(row.status),
    // The monthly obligation, from core.outlet_targets via the LATERAL subquery
    // on the outlet read. Zero means nobody has planned this month for this
    // outlet, which is a real state and not an error.
    kuotaBulanan: row.current_month_target_qty,
    terdaftarPada: row.created_at,
    termin: row.payment_terms_days,
    batasKredit: row.credit_limit,
    blokirOtomatis: row.auto_block_on_overdue,

    // Deliveries and invoices have no service yet, so these four are not
    // computable here. Reported as zero AND flagged: a zero with the flag down
    // is a figure the screens hide rather than one they draw a meter from.
    terpakaiBulanIni: 0,
    sisaKuota: 0,
    tagihanTertunda: 0,
    // The exception. credit_balance is a column on the outlet, so what this
    // outlet owes is known even where the invoices behind it are not.
    nilaiTertunda: row.credit_balance,
    pengirimanTerakhir: undefined,
    statistikTersedia: false,
  } satisfies OutletView;
}

/**
 * The write payload.
 *
 * Only the fields the service accepts. `kuotaBulanan` is deliberately absent:
 * the monthly figure belongs to core.outlet_targets and is edited per product
 * per month on its own screen — writing it from here would be a second author
 * for a number that is a sum of others.
 */
function toWire(input: Partial<OutletEntity>, forUpdate: boolean) {
  const body: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined) body[key] = value;
  };

  put("code", input.kode);
  // branch_id is deliberately not sent. The service files an outlet against the
  // tenant's default branch when none is named, and each PT in this deployment
  // has one -- so a form field for it would have exactly one possible answer.
  put("name", input.nama);
  put("owner_name", input.penanggungJawab);
  put("phone", input.telepon);
  put("address", input.alamat);
  put("district", input.kecamatan);
  put("city", input.kota);
  put("latitude", input.lat);
  put("longitude", input.lng);
  put("payment_terms_days", input.termin);
  put("credit_limit", input.batasKredit);
  put("auto_block_on_overdue", input.blokirOtomatis);
  // Status only on update. A create has none to send -- CreateOutletRequest
  // does not declare the field, and binding refuses an unrecognised one
  // outright, so sending it is a 422 rather than a value quietly ignored. That
  // is the right shape: an outlet is created active, and deactivating one is a
  // decision made later about a record that already exists.
  if (forUpdate) put("status", toWireStatus(input.status));
  return body;
}

async function fetchAll(filters?: OutletFilters): Promise<OutletResponse[]> {
  const wireStatus =
    filters?.status && filters.status !== "Semua" ? toWireStatus(filters.status) : undefined;

  const page = await getList<OutletResponse>("/outlets", {
    pageSize: PAGE_SIZE,
    sort: [{ field: "name" }],
    search: filters?.search,
    filters: [
      ...(wireStatus ? [{ field: "status", operator: "eq" as const, value: wireStatus }] : []),
      ...(filters?.kecamatan && filters.kecamatan !== "Semua"
        ? [{ field: "district", operator: "eq" as const, value: filters.kecamatan }]
        : []),
    ],
  });
  return page.items;
}

async function getOutletList(filters?: OutletFilters): Promise<OutletView[]> {
  // Search, status and district are all sent to the server rather than filtered
  // here: a page is 100 rows, so filtering after the fact would search one page
  // of a longer list and quietly report that the rest do not match.
  return (await fetchAll(filters)).map(toView);
}

async function getOutletDetail(id: string): Promise<OutletView> {
  return toView(await getOne<OutletResponse>(`/outlets/${id}`));
}

async function createOrUpdateOutlet(
  input: Partial<OutletEntity> & { id?: string },
): Promise<OutletView> {
  if (!input.id) {
    return toView(await send<OutletResponse>("post", "/outlets", toWire(input, false)));
  }

  // The version the caller last read, fetched immediately before the write.
  //
  // Read-then-write rather than remembered, because the form holds a domain
  // object that has no version field: adding one would put an
  // optimistic-locking counter into the shape every screen passes around. The
  // window this leaves is the round trip, and the server still refuses a write
  // that loses it — the client just cannot narrate the conflict as well.
  const current = await getOne<OutletResponse>(`/outlets/${input.id}`);
  const updated = await send<OutletResponse>("put", `/outlets/${input.id}`, {
    ...toWire(input, true),
    version: current.version,
  });
  return toView(updated);
}

async function removeOutlet(id: string): Promise<void> {
  await send("delete", `/outlets/${id}`);
}

async function getKecamatanOptions(): Promise<string[]> {
  const rows = await fetchAll();
  return [...new Set(rows.map((r) => r.district).filter((d): d is string => !!d))].sort();
}

async function exportOutlet(): Promise<number> {
  const rows = await getOutletList();
  // The delivery-derived columns the mock exports are dropped rather than
  // written as zeros: a spreadsheet outlives the screen that explains it, and a
  // column of zeros headed "Terpakai Bulan Ini" is a number someone will add up.
  exportCsv(
    `${outletLabel()}-${timestampSuffix()}`,
    [
      "Kode",
      "Nama",
      "Penanggung Jawab",
      "Telepon",
      "Alamat",
      "Kecamatan",
      "Kota",
      "Status",
      "Kuota Bulanan",
      "Termin (hari)",
      "Batas Kredit",
      "Saldo Kredit",
    ],
    rows.map((p) => [
      p.kode,
      p.nama,
      p.penanggungJawab,
      p.telepon,
      p.alamat,
      p.kecamatan,
      p.kota,
      p.status,
      p.kuotaBulanan,
      p.termin,
      p.batasKredit,
      p.nilaiTertunda,
    ]),
  );
  return rows.length;
}

export const outletApiHttp: OutletApi = {
  getOutletList,
  getOutletDetail,
  createOrUpdateOutlet,
  removeOutlet,
  getKecamatanOptions,
  exportOutlet,
};
