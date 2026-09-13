/**
 * The system screen's remainder, against the real API.
 *
 * # Suppliers are not a master table
 *
 * Per this plan's own decision 5, matching `sa/api::getSupplierOptions()`'s
 * own precedent: the backend has no `core.suppliers` table, and inventing
 * one to populate this screen would be a table nobody maintains --
 * `core.schedule_agreements.supplier_name` is free text, and that free text
 * *is* the supplier list. `getSupplierList` derives distinct names, agreement
 * counts and remaining active quota straight from `/schedule-agreements`,
 * the same source `sa`'s own supplier dropdown reads. There is nothing to
 * create, rename or delete -- a supplier that stops appearing in schedule
 * agreements simply stops appearing here, so `saveSupplier`/`deleteSupplier`
 * refuse outright rather than editing a record that does not exist.
 *
 * # Numbering has no backend at all
 *
 * `operasi` (working days, stop duration, lead time, geofence radius,
 * driver-location recording) is real -- backed by the same five
 * `iam.tenant_settings` columns `settingsApi.http.ts` already maps, so
 * `saveOperations` routes through `settingsApi.updateSettings()` instead of
 * a bespoke write, per this step's own cleanup instruction. `penomoran`
 * (document-number prefixes) is a different story: `core.document_sequences`
 * fixes each document type's prefix at provisioning time
 * (`provision_branch_sequences()`), not a column any tenant can read or
 * write per-tenant -- `settingsApi`'s own `defaults.ts` already treats it as
 * an empty placeholder for exactly this reason. `saveNumbering` stays
 * mock-only; routing it through `settingsApi` the same way `saveOperations`
 * is would be sending a write nothing on the other end can receive.
 */
import { assertMockAllowed } from "@/lib/dataSource";
import { getList } from "@/lib/api";
import { getSettings, updateSettings } from "@/features/settings/api/settingsApi";
import type { NumberingEntity, OperationsEntity, SupplierEntity } from "@/mocks/types";
import type { SupplierView, SystemApi } from "./contract";

/** Mirrors the fields of sa's own AgreementResponse this adapter needs. */
interface AgreementResponse {
  supplier_name?: string;
  sa_status: string;
  total_quota_qty: number;
  used_quota_qty: number;
}

async function getSupplierList(): Promise<SupplierView[]> {
  const page = await getList<AgreementResponse>("/schedule-agreements", { pageSize: 100 });

  const bySupplier = new Map<string, { jumlahSA: number; kuotaAktif: number }>();
  for (const row of page.items) {
    if (!row.supplier_name) continue;
    const entry = bySupplier.get(row.supplier_name) ?? { jumlahSA: 0, kuotaAktif: 0 };
    entry.jumlahSA += 1;
    if (row.sa_status === "active") {
      entry.kuotaAktif += row.total_quota_qty - row.used_quota_qty;
    }
    bySupplier.set(row.supplier_name, entry);
  }

  return [...bySupplier.entries()]
    .map(([nama, counts]) => ({
      // There is no id to key on -- the name is the identity, the same way
      // it is the join key against core.schedule_agreements.supplier_name.
      id: nama,
      kode: "",
      nama,
      alamat: "",
      penanggungJawab: "",
      telepon: "",
      // Every name that still appears in the agreement list is, by
      // definition, in current use -- there is no separate deactivation
      // state to read.
      aktif: true,
      ...counts,
    }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

async function saveSupplier(input: Partial<SupplierEntity> & { id?: string }): Promise<SupplierEntity> {
  assertMockAllowed("system.saveSupplier");
  return {
    id: input.id ?? "",
    kode: input.kode ?? "",
    nama: input.nama ?? "",
    alamat: input.alamat ?? "",
    penanggungJawab: input.penanggungJawab ?? "",
    telepon: input.telepon ?? "",
    aktif: input.aktif ?? true,
  };
}

async function deleteSupplier(): Promise<void> {
  assertMockAllowed("system.deleteSupplier");
}

/**
 * The prefixes `core.document_sequences`' own `provision_branch_sequences()`
 * fixes at branch-creation time -- not read from anywhere, because there is
 * nowhere to read them from; this is what the migration itself hard-codes.
 * Shown so the screen has real values rather than blanks, not because a
 * tenant can change them: `NumberingSection` disables editing in this build
 * for exactly that reason.
 */
const FIXED_PREFIXES: NumberingEntity = {
  suratJalan: "SJ",
  invoice: "INV",
  rencana: "RD",
  pesanan: "PO",
  sertakanTanggal: true,
};

async function getSystemConfig() {
  const settings = await getSettings();
  return { penomoran: FIXED_PREFIXES, operasi: settings.operasi };
}

async function saveNumbering(penomoran: NumberingEntity): Promise<NumberingEntity> {
  assertMockAllowed("system.saveNumbering");
  return penomoran;
}

async function saveOperations(operasi: OperationsEntity): Promise<OperationsEntity> {
  if (operasi.hariKerja.length === 0) {
    throw new Error("Pilih minimal satu hari kerja.");
  }
  if (operasi.durasiSinggahMenit < 15) {
    throw new Error("Durasi singgah minimal 15 menit.");
  }
  if (operasi.rekamLokasi && operasi.radiusGeofenceMeter < 50) {
    throw new Error("Radius wajar minimal 50 meter agar tidak salah menandai.");
  }
  const saved = await updateSettings({ operasi });
  return saved.operasi;
}

export const systemApiHttp: SystemApi = {
  getSupplierList,
  saveSupplier,
  deleteSupplier,
  getSystemConfig,
  saveNumbering,
  saveOperations,
};
