import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import {
  activateScheduleAgreement,
  createScheduleAgreement,
  deleteScheduleAgreement,
} from "@/mocks/rules";
import { startOfToday } from "@/mocks/seed";
import { printDocument } from "@/lib/export";
import type { SAEntity } from "@/mocks/types";
import type {
  ScheduleAgreement,
  SAFilterParams,
  UploadSAPayload,
} from "../types";
import { supplierLabelTitle, unitLabelTitle } from "@/lib/lexicon";

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
  };
}

export async function getSAList(
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

export async function getSADetail(id: string): Promise<ScheduleAgreement> {
  await latency("read");
  const db = scopedDb();
  const sa = db.scheduleAgreements.find((s) => s.id === id);
  if (!sa) throw new Error("Schedule Agreement tidak ditemukan.");
  return toView(sa, db.plans.filter((p) => p.saId === sa.id).length);
}

export async function uploadSA(
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

export async function activateSA(id: string): Promise<ScheduleAgreement> {
  await latency("write");
  return toView(activateScheduleAgreement(id), 0);
}

export async function deleteSA(id: string): Promise<void> {
  await latency("write");
  deleteScheduleAgreement(id);
}

/**
 * Supply sources available when registering a new agreement. Comes from the
 * master list in Konfigurasi Sistem, falling back to whatever historical
 * agreements reference so nothing disappears from an existing database.
 */
export async function getSupplierOptions(): Promise<string[]> {
  await latency("read");
  const db = scopedDb();
  const master = db.suppliers.filter((s) => s.aktif).map((s) => s.nama);
  const historical = db.scheduleAgreements.map((s) => s.supplier);
  return [...new Set([...master, ...historical])].sort();
}

/** Produces the printable quota summary sheet for an agreement. */
export async function printSA(id: string): Promise<void> {
  await latency("read");
  const db = scopedDb();
  const sa = db.scheduleAgreements.find((s) => s.id === id);
  if (!sa) throw new Error("Schedule Agreement tidak ditemukan.");

  const plans = db.plans.filter((p) => p.saId === sa.id && p.status !== "Batal");
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const tanggal = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  printDocument(
    `${sa.nomorSA} — Ringkasan Kuota`,
    `
    <p class="eyebrow">${db.settings.namaPerusahaan} · Agen ${db.settings.nomorAgen}</p>
    <h1>Ringkasan Kuota Schedule Agreement</h1>
    <hr class="rule" />
    <div class="meta">
      <div>Nomor SA<strong class="code">${sa.nomorSA}</strong></div>
      <div>${supplierLabelTitle()}<strong>${sa.supplier}</strong></div>
      <div>Periode<strong>${tanggal(sa.periodeMulai)} – ${tanggal(sa.periodeBerakhir)}</strong></div>
      <div>Status<strong>${sa.status}</strong></div>
    </div>
    <table>
      <thead><tr><th>Uraian</th><th style="text-align:right">${unitLabelTitle()}</th></tr></thead>
      <tbody>
        <tr><td>Total kuota</td><td class="num">${fmt(sa.totalKuota)}</td></tr>
        <tr><td>Sudah dialokasikan</td><td class="num">${fmt(sa.terpakai)}</td></tr>
      </tbody>
      <tfoot><tr><td>Sisa kuota</td><td class="num">${fmt(sa.totalKuota - sa.terpakai)}</td></tr></tfoot>
    </table>
    <table>
      <thead><tr><th>Rencana distribusi</th><th>Tanggal</th><th>Status</th></tr></thead>
      <tbody>
        ${
          plans.length === 0
            ? `<tr><td colspan="3">Belum ada rencana yang menarik kuota dari SA ini.</td></tr>`
            : plans
                .map(
                  (p) =>
                    `<tr><td class="code">${p.kode}</td><td>${tanggal(p.tanggal)}</td><td>${p.status}</td></tr>`,
                )
                .join("")
        }
      </tbody>
    </table>
    <div class="sign">
      <div>Dicetak oleh<span>${db.settings.namaPerusahaan}</span></div>
      <div>Mengetahui<span>${sa.supplier}</span></div>
    </div>`,
  );
}
