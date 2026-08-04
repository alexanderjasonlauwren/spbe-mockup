import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { deletePangkalan, savePangkalan } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import { isoDate, startOfToday } from "@/mocks/seed";
import type { PangkalanEntity, PangkalanStatus } from "@/mocks/types";

export interface PangkalanView extends PangkalanEntity {
  /** Cylinders delivered to this outlet in the current month. */
  terpakaiBulanIni: number;
  sisaKuota: number;
  /** Invoices still awaiting verification. */
  tagihanTertunda: number;
  nilaiTertunda: number;
  pengirimanTerakhir?: string;
}

function monthStart() {
  const now = startOfToday();
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function toView(p: PangkalanEntity): PangkalanView {
  const db = scopedDb();
  const from = monthStart();
  const mine = db.deliveries.filter((d) => d.pangkalanId === p.id);
  const terpakai = mine
    .filter((d) => d.tanggal >= from)
    .reduce((s, d) => s + d.realisasi, 0);
  const tagihan = db.invoices.filter(
    (x) =>
      x.pangkalanId === p.id &&
      x.status !== "Batal" &&
      x.total - x.terbayar - x.kredit > 0,
  );

  return {
    ...p,
    terpakaiBulanIni: terpakai,
    sisaKuota: Math.max(0, p.kuotaBulanan - terpakai),
    tagihanTertunda: tagihan.length,
    nilaiTertunda: tagihan.reduce((s, x) => s + (x.total - x.terbayar - x.kredit), 0),
    pengirimanTerakhir: mine
      .filter((d) => d.status === "Selesai")
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0]?.tanggal,
  };
}

export async function getPangkalanList(filters?: {
  search?: string;
  status?: PangkalanStatus | "Semua";
  kecamatan?: string;
}): Promise<PangkalanView[]> {
  await latency("read");
  return scopedDb()
    .pangkalan.map(toView)
    .filter((p) => {
      if (filters?.status && filters.status !== "Semua" && p.status !== filters.status)
        return false;
      if (filters?.kecamatan && filters.kecamatan !== "Semua" && p.kecamatan !== filters.kecamatan)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          p.nama.toLowerCase().includes(q) ||
          p.kode.toLowerCase().includes(q) ||
          p.penanggungJawab.toLowerCase().includes(q) ||
          p.kecamatan.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function getPangkalanDetail(id: string): Promise<PangkalanView> {
  await latency("read");
  const p = scopedDb().pangkalan.find((x) => x.id === id);
  if (!p) throw new Error("Pangkalan tidak ditemukan.");
  return toView(p);
}

/** Recent surat jalan for one outlet, shown on its detail page. */
export async function getPangkalanHistory(id: string, limit = 10) {
  await latency("read");
  const db = scopedDb();
  return db.deliveries
    .filter((d) => d.pangkalanId === id)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .slice(0, limit)
    .map((d) => ({
      id: d.id,
      kode: d.kode,
      tanggal: d.tanggal,
      jam: d.jamRencana,
      driver: db.drivers.find((x) => x.id === d.driverId)?.nama ?? "—",
      target: d.target,
      realisasi: d.realisasi,
      status: d.status,
    }));
}

export async function createOrUpdatePangkalan(input: Partial<PangkalanEntity> & { id?: string }) {
  await latency("write");
  return toView(savePangkalan(input));
}

export async function removePangkalan(id: string) {
  await latency("write");
  deletePangkalan(id);
}

export async function getKecamatanOptions(): Promise<string[]> {
  await latency("read");
  return [...new Set(scopedDb().pangkalan.map((p) => p.kecamatan))].sort();
}

export async function exportPangkalan() {
  await latency("read");
  const rows = await getPangkalanList();
  exportCsv(
    `pangkalan-${timestampSuffix()}`,
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
      "Terpakai Bulan Ini",
      "Sisa Kuota",
      "Tagihan Tertunda",
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
      p.terpakaiBulanIni,
      p.sisaKuota,
      p.tagihanTertunda,
    ]),
  );
  return rows.length;
}
