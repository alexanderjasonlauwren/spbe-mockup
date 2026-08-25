import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { deleteOutlet, saveOutlet } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import { isoDate, startOfToday } from "@/mocks/seed";
import type { OutletEntity, OutletStatus } from "@/mocks/types";
import { outletLabel, outletLabelTitle } from "@/lib/lexicon";

export interface OutletView extends OutletEntity {
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

function toView(p: OutletEntity): OutletView {
  const db = scopedDb();
  const from = monthStart();
  const mine = db.deliveries.filter((d) => d.outletId === p.id);
  const terpakai = mine
    .filter((d) => d.tanggal >= from)
    .reduce((s, d) => s + d.realisasi, 0);
  const tagihan = db.invoices.filter(
    (x) =>
      x.outletId === p.id &&
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

export async function getOutletList(filters?: {
  search?: string;
  status?: OutletStatus | "Semua";
  kecamatan?: string;
}): Promise<OutletView[]> {
  await latency("read");
  return scopedDb()
    .outlets.map(toView)
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

export async function getOutletDetail(id: string): Promise<OutletView> {
  await latency("read");
  const p = scopedDb().outlets.find((x) => x.id === id);
  if (!p) throw new Error(`${outletLabelTitle()} tidak ditemukan.`);
  return toView(p);
}

/** Recent surat jalan for one outlet, shown on its detail page. */
export async function getOutletHistory(id: string, limit = 10) {
  await latency("read");
  const db = scopedDb();
  return db.deliveries
    .filter((d) => d.outletId === id)
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

export async function createOrUpdateOutlet(input: Partial<OutletEntity> & { id?: string }) {
  await latency("write");
  return toView(saveOutlet(input));
}

export async function removeOutlet(id: string) {
  await latency("write");
  deleteOutlet(id);
}

export async function getKecamatanOptions(): Promise<string[]> {
  await latency("read");
  return [...new Set(scopedDb().outlets.map((p) => p.kecamatan))].sort();
}

export async function exportOutlet() {
  await latency("read");
  const rows = await getOutletList();
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
