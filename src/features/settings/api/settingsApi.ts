import { getActiveScope, scopedDb } from "@/mocks/scope";
import { getDb, latency, resetDb } from "@/mocks/db";
import { clearOverride, saveSettings } from "@/mocks/rules";
import { exportJson, timestampSuffix } from "@/lib/export";
import type { ResolvedSettingsEntity, SettingsEntity } from "@/mocks/types";
import { term, type TermKey } from "@/lib/lexicon";

export async function getSettings(): Promise<SettingsEntity> {
  await latency("read");
  return structuredClone(scopedDb().settings);
}

/**
 * Fields a tenant inherits from its parent when it has not set them.
 *
 * The split follows the backend's two tables. iam.tenant_settings inherits per
 * column — how a tenant WORKS and what it CALLS things is a sensible default for
 * a group to set once. iam.tenant_profiles never does: a subsidiary that is its
 * own PT has its own NPWP and agent number, and falling back to its parent's
 * would put the wrong legal identity on an invoice.
 *
 * So identity fields are absent from this list on purpose, and the settings page
 * gives them no badge.
 */
export const INHERITABLE_FIELDS = [
  "zonaWaktu",
  "jamOperasionalMulai",
  "jamOperasionalSelesai",
  "targetHarian",
  "istilah",
  "operasi",
] as const satisfies readonly (keyof SettingsEntity)[];

/**
 * A field key that can be inherited.
 *
 * Named ...Key rather than InheritableField because the component that renders
 * one owns that name, and a type sharing it with a component is a collision
 * waiting for whoever imports both.
 */
export type InheritableFieldKey = (typeof INHERITABLE_FIELDS)[number];

/**
 * The acting tenant's settings, with provenance.
 *
 * Three parts, because a form needs all three: `effective` to render, `own` to
 * know which fields this tenant actually chose, and `inheritedFrom` to say where
 * the rest came from. Saving from `effective` is the bug this shape prevents.
 */
export async function getSettingsDetail(): Promise<ResolvedSettingsEntity> {
  await latency("read");
  const db = getDb();
  const scope = getActiveScope();
  const own = db.settingsByTenant.find((r) => r.tenantId === scope.actingTenantId);

  const inheritedFrom: ResolvedSettingsEntity["inheritedFrom"] = {};
  for (const field of INHERITABLE_FIELDS) {
    if (own?.values[field] !== undefined) continue;
    // Nearest ancestor that defines it. Walked rather than asked of the
    // resolver so the ANSWER and the SOURCE cannot disagree — both come from
    // the same walk in the same order.
    let current = db.tenants.find((t) => t.id === scope.actingTenantId)?.indukId;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const row = db.settingsByTenant.find((r) => r.tenantId === current);
      if (row?.values[field] !== undefined) {
        const source = db.tenants.find((t) => t.id === current);
        if (source) inheritedFrom[field] = structuredClone(source);
        break;
      }
      current = db.tenants.find((t) => t.id === current)?.indukId;
    }
  }

  return {
    own: structuredClone(own?.values ?? {}),
    effective: structuredClone(scopedDb().settings),
    inheritedFrom,
  };
}

/**
 * Clears a tenant's override, restoring inheritance for that field.
 *
 * Deleting the key rather than writing a null: an absent key is what "ask my
 * parent" means in this shape, and a null would be a value the tenant had
 * chosen.
 */
export async function clearSettingOverride(field: InheritableFieldKey) {
  await latency("write");
  return clearOverride(field);
}

export async function updateSettings(patch: Partial<SettingsEntity>) {
  await latency("write");
  // An empty word would leave columns and toasts reading "1.284 " — the
  // console has no fallback once the tenant has chosen its own vocabulary.
  if (patch.istilah) {
    for (const key of Object.keys(patch.istilah) as TermKey[]) {
      if (patch.istilah[key]?.trim()) continue;
      throw new Error(`Istilah "${key}" wajib diisi — saat ini "${term(key)}".`);
    }
  }
  if (
    patch.jamOperasionalMulai &&
    patch.jamOperasionalSelesai &&
    patch.jamOperasionalSelesai <= patch.jamOperasionalMulai
  ) {
    throw new Error("Jam tutup harus setelah jam buka.");
  }
  return saveSettings(patch);
}

/** Sends a sample of the WhatsApp reminder so the wording can be checked. */
export async function sendTestReminder(nomor: string) {
  await latency("write");
  if (!/^[0-9+\-\s]{8,}$/.test(nomor)) {
    throw new Error("Nomor pengirim tidak valid.");
  }
  return { nomor, terkirimPada: new Date().toISOString() };
}

/** Downloads the whole console state — the demo equivalent of a DB dump. */
export async function exportData() {
  await latency("read");
  exportJson(`sidistrib-data-${timestampSuffix()}`, scopedDb());
  return true;
}

/** Wipes local state and regenerates a fresh working day. */
export async function resetData() {
  await latency("write");
  resetDb();
  return true;
}
