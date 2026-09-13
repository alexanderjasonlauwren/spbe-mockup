/**
 * Drivers, against the real API.
 *
 * # The PII rule, again
 *
 * `phone_encrypted` and `ktp_encrypted` are AES-256-GCM at rest and arrive here
 * in clear. They go onto the domain object and nowhere else — no log, no error
 * message, no analytics event. A random nonce also means two encryptions of the
 * same number differ, which is why the server declares no searchable phone
 * column and why search here covers the name and the licence number instead.
 *
 * # And the model that is not here
 *
 * No plate, no vehicle, no capacity. `core.drivers` has no column for any of
 * them; the pairing is on `core.dispatch_trips`. A screen that wants to show a
 * driver with their truck reads the dispatch board — which is also the only
 * place that can answer "which truck, on which day".
 */
import { getList, getOne, send } from "@/lib/api";
import { exportCsv, timestampSuffix } from "@/lib/export";
import type { DriverEntity, DriverStatusEntity } from "@/mocks/types";
import type { DriverApi, DriverFilters, DriverView } from "./contract";

/** Mirrors the backend's DriverResponse. */
interface DriverResponse {
  id: string;
  branch_id: string;
  user_id?: string;
  code: string;
  full_name: string;
  phone: string;
  ktp_number?: string;
  address?: string;
  city?: string;
  sim_number?: string;
  sim_type?: string;
  sim_expires_at?: string;
  performance_score: number;
  rating: number;
  total_deliveries: number;
  on_time_deliveries: number;
  employment_status: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/** 100 is every list definition's MaxPageSize; the server refuses more. */
const PAGE_SIZE = 100;

/**
 * The service's employment status mapped onto the console's five words.
 *
 * The console's vocabulary is about where a driver is right now — Standby,
 * Dalam Perjalanan, Bongkar Muat, Selesai — and only `Cuti` is a fact about
 * employment. The rest are positions on a run, which the dispatch board knows
 * and this list does not, so everyone available maps to Standby rather than to
 * a state this endpoint cannot see.
 */
function toStatus(employment: string): DriverStatusEntity {
  return employment === "on_leave" ? "Cuti" : "Standby";
}

function toWireEmployment(status?: DriverStatusEntity): string | undefined {
  if (!status) return undefined;
  return status === "Cuti" ? "on_leave" : "active";
}

function toView(row: DriverResponse): DriverView {
  return {
    id: row.id,
    // See the outlet adapter: row-level security decides what this session can
    // see, so a client-side tenant is a second opinion that can only be wrong.
    tenantId: "",
    branchId: row.branch_id,
    kode: row.code,
    nama: row.full_name,
    telepon: row.phone,
    nomorSim: row.sim_number ?? "—",
    status: toStatus(row.employment_status),
    bergabungPada: row.created_at,

    // Counted from core.deliveries, which has no service. Flagged rather than
    // reported: "0 pengiriman, ketepatan 100%" describes a driver who has done
    // nothing perfectly, which is a sentence with no true reading.
    tugasHariIni: 0,
    selesaiHariIni: 0,
    muatanHariIni: 0,
    pengiriman30Hari: 0,
    unit30Hari: 0,
    ketepatan: 0,
    statistikTersedia: false,
  } satisfies DriverView;
}

/**
 * The write payload.
 *
 * `phone` is required by the service and validated as an Indonesian number
 * there, so a malformed one is a 422 naming the field rather than a row saved
 * with a number nobody can ring.
 */
function toWire(input: Partial<DriverEntity>, forUpdate: boolean) {
  const body: Record<string, unknown> = {};
  const put = (key: string, value: unknown) => {
    if (value !== undefined) body[key] = value;
  };

  // Required on create by the service, which makes it unique per tenant. The
  // console collects it for the same reason it collects an outlet's: it is the
  // reference a dispatcher writes on a run sheet.
  put("code", input.kode);
  put("full_name", input.nama);
  put("phone", input.telepon);
  put("sim_number", input.nomorSim);
  put("employment_status", toWireEmployment(input.status));
  // No plate, model or capacity. There are no columns for them, and the request
  // types do not declare them -- binding refuses an unrecognised field, so
  // sending one is a 422 rather than a value quietly dropped.
  void forUpdate;
  return body;
}

async function fetchAll(filters?: DriverFilters): Promise<DriverResponse[]> {
  const employment =
    filters?.status && filters.status !== "Semua" ? toWireEmployment(filters.status) : undefined;

  const page = await getList<DriverResponse>("/drivers", {
    pageSize: PAGE_SIZE,
    sort: [{ field: "full_name" }],
    search: filters?.search,
    filters: [
      { field: "status", operator: "eq" as const, value: "atv" },
      ...(employment
        ? [{ field: "employment_status", operator: "eq" as const, value: employment }]
        : []),
    ],
  });
  return page.items;
}

async function getDrivers(filters?: DriverFilters): Promise<DriverView[]> {
  return (await fetchAll(filters)).map(toView);
}

async function getDriverDetail(id: string): Promise<DriverView> {
  return toView(await getOne<DriverResponse>(`/drivers/${id}`));
}

async function createOrUpdateDriver(
  input: Partial<DriverEntity> & { id?: string },
): Promise<DriverView> {
  if (!input.id) {
    return toView(await send<DriverResponse>("post", "/drivers", toWire(input, false)));
  }

  // The version the caller last read, fetched immediately before the write —
  // the same trade the outlet adapter makes, and for the same reason: the form
  // holds a domain object with no version field.
  const current = await getOne<DriverResponse>(`/drivers/${input.id}`);
  const updated = await send<DriverResponse>("put", `/drivers/${input.id}`, {
    ...toWire(input, true),
    version: current.version,
  });
  return toView(updated);
}

async function removeDriver(id: string): Promise<void> {
  await send("delete", `/drivers/${id}`);
}

async function exportDrivers(): Promise<number> {
  const rows = await getDrivers();
  // The delivery-derived columns are dropped rather than exported as zeros: a
  // spreadsheet outlives the screen that explains it, and a column of zeros
  // headed "Pengiriman 30 Hari" is a number someone will add up.
  exportCsv(
    `armada-driver-${timestampSuffix()}`,
    ["Kode", "Nama", "Telepon", "No. SIM", "Status"],
    rows.map((d) => [d.kode, d.nama, d.telepon, d.nomorSim, d.status]),
  );
  return rows.length;
}

export const driverApiHttp: DriverApi = {
  getDrivers,
  getDriverDetail,
  createOrUpdateDriver,
  removeDriver,
  exportDrivers,
};
