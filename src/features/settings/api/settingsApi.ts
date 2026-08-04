import { scopedDb } from "@/mocks/scope";
import { latency, resetDb } from "@/mocks/db";
import { saveSettings } from "@/mocks/rules";
import { exportJson, timestampSuffix } from "@/lib/export";
import type { SettingsEntity } from "@/mocks/types";

export async function getSettings(): Promise<SettingsEntity> {
  await latency("read");
  return structuredClone(scopedDb().settings);
}

export async function updateSettings(patch: Partial<SettingsEntity>) {
  await latency("write");
  if (patch.hargaPerTabung != null && patch.hargaPerTabung <= 0) {
    throw new Error("Harga per tabung harus lebih dari nol.");
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
