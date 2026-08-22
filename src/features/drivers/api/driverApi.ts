import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { deleteDriver, saveDriver } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import { addDays, isoDate, startOfToday } from "@/mocks/seed";
import { todayIso } from "@/mocks/selectors";
import type { DriverEntity, DriverStatusEntity } from "@/mocks/types";
import { unitLabelTitle } from "@/lib/lexicon";

export interface DriverView extends DriverEntity {
  /** Surat jalan assigned today. */
  tugasHariIni: number;
  selesaiHariIni: number;
  muatanHariIni: number;
  /** Utilisation of the truck's capacity today, 0..1. */
  utilisasi: number;
  /** Completed drops over the trailing 30 days. */
  pengiriman30Hari: number;
  unit30Hari: number;
  /** Share of drops finished on the day they were planned, 0..1. */
  ketepatan: number;
}

function toView(d: DriverEntity): DriverView {
  const db = scopedDb();
  const today = todayIso();
  const from = isoDate(addDays(startOfToday(), -29));

  const todays = db.deliveries.filter(
    (x) => x.driverId === d.id && x.tanggal === today,
  );
  const window = db.deliveries.filter(
    (x) => x.driverId === d.id && x.tanggal >= from && x.tanggal <= today,
  );
  const closed = window.filter((x) => x.status === "Selesai" || x.status === "Tertunda");
  const muatan = todays.reduce((s, x) => s + x.target, 0);

  return {
    ...d,
    tugasHariIni: todays.length,
    selesaiHariIni: todays.filter((x) => x.status === "Selesai").length,
    muatanHariIni: muatan,
    utilisasi: d.kapasitas === 0 ? 0 : Math.min(1, muatan / d.kapasitas),
    pengiriman30Hari: window.filter((x) => x.status === "Selesai").length,
    unit30Hari: window.reduce((s, x) => s + x.realisasi, 0),
    ketepatan:
      closed.length === 0
        ? 1
        : closed.filter((x) => x.status === "Selesai").length / closed.length,
  };
}

export async function getDrivers(filters?: {
  search?: string;
  status?: DriverStatusEntity | "Semua";
}): Promise<DriverView[]> {
  await latency("read");
  return scopedDb()
    .drivers.map(toView)
    .filter((d) => {
      if (filters?.status && filters.status !== "Semua" && d.status !== filters.status)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          d.nama.toLowerCase().includes(q) ||
          d.plat.toLowerCase().includes(q) ||
          d.armada.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function getDriverDetail(id: string): Promise<DriverView> {
  await latency("read");
  const d = scopedDb().drivers.find((x) => x.id === id);
  if (!d) throw new Error("Driver tidak ditemukan.");
  return toView(d);
}

/** Today's stop list for one truck. */
export async function getDriverSchedule(id: string) {
  await latency("read");
  const db = scopedDb();
  return db.deliveries
    .filter((d) => d.driverId === id && d.tanggal === todayIso())
    .sort((a, b) => a.jamRencana.localeCompare(b.jamRencana))
    .map((d) => ({
      id: d.id,
      kode: d.kode,
      jam: d.jamRencana,
      outlet: db.outlets.find((p) => p.id === d.outletId)?.nama ?? "—",
      kecamatan: db.outlets.find((p) => p.id === d.outletId)?.kecamatan ?? "—",
      target: d.target,
      realisasi: d.realisasi,
      status: d.status,
    }));
}

export async function createOrUpdateDriver(input: Partial<DriverEntity> & { id?: string }) {
  await latency("write");
  return toView(saveDriver(input));
}

export async function removeDriver(id: string) {
  await latency("write");
  deleteDriver(id);
}

export async function exportDrivers() {
  await latency("read");
  const rows = await getDrivers();
  exportCsv(
    `armada-driver-${timestampSuffix()}`,
    [
      "Nama",
      "Telepon",
      "No. SIM",
      "Plat",
      "Armada",
      "Kapasitas",
      "Status",
      "Tugas Hari Ini",
      "Selesai Hari Ini",
      "Muatan Hari Ini",
      "Pengiriman 30 Hari",
      `${unitLabelTitle()} 30 Hari`,
      "Ketepatan (%)",
    ],
    rows.map((d) => [
      d.nama,
      d.telepon,
      d.nomorSim,
      d.plat,
      d.armada,
      d.kapasitas,
      d.status,
      d.tugasHariIni,
      d.selesaiHariIni,
      d.muatanHariIni,
      d.pengiriman30Hari,
      d.unit30Hari,
      Math.round(d.ketepatan * 100),
    ]),
  );
  return rows.length;
}
