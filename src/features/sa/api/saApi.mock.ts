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
  createScheduleAgreement,
  deleteScheduleAgreement,
} from "@/mocks/rules";
import { startOfToday } from "@/mocks/seed";
import type { SAEntity } from "@/mocks/types";
import type { ScheduleAgreement, SAFilterParams, UploadSAPayload } from "../types";

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

/** Produces the printable quota summary sheet for an agreement. */

import type { ScheduleAgreementApi } from "./contract";

export const saApiMock: ScheduleAgreementApi = {
  getSAList,
  getSADetail,
  uploadSA,
  activateSA,
  deleteSA,
  getSupplierOptions,
};
