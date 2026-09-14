/**
 * Schedule agreements, against the mock database.
 *
 * Unchanged behaviour: this is the file the demo has always run on, moved
 * behind a contract so an HTTP adapter can sit beside it.
 */
import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import {
  activateScheduleAgreement,
  applySaImport,
  createScheduleAgreement,
  deleteScheduleAgreement,
  recordSaImport,
} from "@/mocks/rules";
import { buildTargetDiff, parseTargetCsv, PESAN_TANPA_BARIS } from "./targetImport";
import { startOfToday } from "@/mocks/seed";
import type { SAEntity } from "@/mocks/types";
import type {
  SAImportApplied,
  SAImportBatch,
  SAImportSummary,
  SIM3LONApplied,
  SIM3LONPreview,
  ScheduleAgreement,
  SAFilterParams,
  UploadSAPayload,
} from "../types";

function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  return Math.round((target - startOfToday().getTime()) / 86_400_000);
}

function toView(sa: SAEntity, planCount: number): ScheduleAgreement {
  return {
    id: sa.id,
    nomorSA: sa.nomorSA,
    supplier: sa.supplier,
    periodeMulai: sa.periodeMulai,
    periodeBerakhir: sa.periodeBerakhir,
    totalKuota: sa.totalKuota,
    sudahDidistribusikan: sa.terpakai,
    sisaKuota: Math.max(0, sa.totalKuota - sa.terpakai),
    status: sa.status,
    sisaHari: daysUntil(sa.periodeBerakhir),
    catatan: sa.catatan,
    namaDokumen: sa.namaDokumen,
    diunggahOleh: sa.diunggahOleh,
    diunggahPada: sa.diunggahPada,
    jumlahRencana: planCount,
    products: sa.productId
      ? [
          {
            productId: sa.productId,
            productName: sa.productName ?? "Produk",
            totalKuota: sa.totalKuota,
            dialokasikan: sa.terpakai,
            terpakai: sa.terpakai,
            sisaKuota: Math.max(0, sa.totalKuota - sa.terpakai),
          },
        ]
      : [],
  };
}

async function getSAList(
  filters?: SAFilterParams,
): Promise<ScheduleAgreement[]> {
  await latency("read");
  const db = scopedDb();

  return db.scheduleAgreements
    .map((sa) =>
      toView(
        sa,
        db.plans.filter((p) => p.saId === sa.id && p.status !== "Batal").length,
      ),
    )
    .filter((sa) => {
      if (filters?.status && filters.status !== "Semua" && sa.status !== filters.status)
        return false;
      if (filters?.bulan != null || filters?.tahun != null) {
        const start = new Date(sa.periodeMulai);
        if (filters.bulan != null && start.getMonth() + 1 !== filters.bulan) return false;
        if (filters.tahun != null && start.getFullYear() !== filters.tahun) return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        if (
          !sa.nomorSA.toLowerCase().includes(q) &&
          !sa.supplier.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => b.periodeMulai.localeCompare(a.periodeMulai));
}

async function getSADetail(id: string): Promise<ScheduleAgreement> {
  await latency("read");
  const db = scopedDb();
  const sa = db.scheduleAgreements.find((s) => s.id === id);
  if (!sa) throw new Error("Schedule Agreement tidak ditemukan.");
  return toView(sa, db.plans.filter((p) => p.saId === sa.id).length);
}

async function uploadSA(
  payload: UploadSAPayload,
): Promise<ScheduleAgreement> {
  await latency("upload");
  const sa = createScheduleAgreement({
    nomorSA: payload.nomorSA,
    supplier: payload.supplier,
    periodeMulai: payload.periodeMulai,
    periodeBerakhir: payload.periodeBerakhir,
    totalKuota: payload.totalKuota,
    catatan: payload.notes,
    namaDokumen: payload.namaDokumen,
  });
  return toView(sa, 0);
}

async function activateSA(id: string): Promise<ScheduleAgreement> {
  await latency("write");
  return toView(activateScheduleAgreement(id), 0);
}

async function deleteSA(id: string): Promise<void> {
  await latency("write");
  deleteScheduleAgreement(id);
}

/**
 * Supply sources available when registering a new agreement. Comes from the
 * master list in Konfigurasi Sistem, falling back to whatever historical
 * agreements reference so nothing disappears from an existing database.
 */
async function getSupplierOptions(): Promise<string[]> {
  await latency("read");
  const db = scopedDb();
  const master = db.suppliers.filter((s) => s.aktif).map((s) => s.nama);
  const historical = db.scheduleAgreements.map((s) => s.supplier);
  return [...new Set([...master, ...historical])].sort();
}

/* ── Base SA imports ───────────────────────────────────────────────────── */

/**
 * The largest file this will read.
 *
 * The same 4 MiB the service allows, and for the same reason: a month of dated
 * quantities is a few kilobytes, so anything approaching this is not the file
 * the person means to upload.
 */
const MAKS_UKURAN = 4 << 20;

async function parseImport(saId: string, file: File): Promise<SAImportBatch> {
  await latency("upload");

  if (file.size > MAKS_UKURAN) {
    throw new Error(
      `Berkas lebih besar dari ${MAKS_UKURAN >> 20} MB, jauh di atas ukuran satu bulan tanggal dan jumlah.`,
    );
  }

  const text = await file.text();
  const parsed = parseTargetCsv(text);
  if (parsed.rows.length === 0) {
    // Distinct from a parse failure: a file of headers only is well-formed and
    // useless, and "0 rows" is more actionable than "invalid file".
    throw new Error(PESAN_TANPA_BARIS);
  }

  const db = scopedDb();
  const existing = new Map(
    db.saDailyTargets.filter((t) => t.saId === saId).map((t) => [t.tanggal, t.target]),
  );

  const batch = recordSaImport({
    saId,
    namaBerkas: file.name,
    checksum: await checksum(file),
    rows: parsed.rows.map((r) => ({ tanggal: r.tanggal, target: r.target })),
  });

  return {
    id: batch.id,
    saId,
    namaBerkas: batch.namaBerkas,
    checksum: batch.checksum,
    diff: buildTargetDiff(parsed, existing),
  };
}

async function applyImport(batchId: string): Promise<SAImportApplied> {
  await latency("write");
  const batch = applySaImport(batchId);
  return { id: batch.id, barisDitulis: batch.barisDitulis };
}

async function previewSIM3LON(file: File, supplierName: string, productId: string): Promise<SIM3LONPreview> {
  void file;
  void supplierName;
  void productId;
  throw new Error("Impor XLSX SIM3LON hanya tersedia saat dashboard terhubung ke API.");
}

async function applySIM3LON(batchId: string): Promise<SIM3LONApplied> {
  void batchId;
  throw new Error("Impor XLSX SIM3LON hanya tersedia saat dashboard terhubung ke API.");
}

/**
 * The mock has no outlet-level import snapshot to show: SIM3LON import only
 * runs against the real API (see previewSIM3LON above), and the Base SA CSV
 * import this mock does model carries dates and quantities, not outlets. Null
 * is the honest answer, the same one a hand-typed agreement gets from the
 * real backend.
 */
async function getImportSummary(id: string): Promise<SAImportSummary | null> {
  void id;
  await latency("read");
  return null;
}

/**
 * SHA-256 of the uploaded bytes.
 *
 * Computed rather than invented, even in the mock: the console renders it as
 * the fingerprint of what was reviewed, and a fabricated one would make the
 * demo teach that the number means nothing.
 *
 * `crypto.subtle` is unavailable over plain HTTP on a non-localhost origin, so
 * an empty string stands for "not computed here" rather than a fake digest.
 */
async function checksum(file: File): Promise<string> {
  if (!globalThis.crypto?.subtle) return "";
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

import type { ScheduleAgreementApi } from "./contract";

export const saApiMock: ScheduleAgreementApi = {
  getSAList,
  getSADetail,
  getImportSummary,
  uploadSA,
  activateSA,
  deleteSA,
  getSupplierOptions,
  parseImport,
  applyImport,
  previewSIM3LON,
  applySIM3LON,
};
