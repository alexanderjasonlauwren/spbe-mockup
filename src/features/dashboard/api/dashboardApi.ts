import { getDb, latency } from "@/mocks/db";
import { addDays, isoDate, startOfToday } from "@/mocks/seed";
import {
  distributedOn,
  monthlyProgress,
  monthlyQuota,
  shareByKecamatan,
  targetOn,
  todayIso,
} from "@/mocks/selectors";
import type {
  DispatchLane,
  DispatchRail,
  KpiSummary,
  MonthlyChartPoint,
  PangkalanShare,
  RecentActivity,
} from "../types";

const toMinutes = (hhmm: string) =>
  Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

export async function getKpiSummary(): Promise<KpiSummary> {
  await latency("read");
  const db = getDb();
  const today = todayIso();
  const yesterday = isoDate(addDays(startOfToday(), -1));
  const quota = monthlyQuota();

  const pending = db.payments.filter((p) => p.status === "Menunggu Verifikasi");
  const dailyTarget = targetOn(today) || db.settings.targetHarian;

  return {
    dailyDistributed: distributedOn(today),
    dailyTarget,
    monthlyQuotaRemaining: quota.sisa,
    monthlyQuotaTotal: quota.total,
    activePangkalan: db.pangkalan.filter((p) => p.status === "Aktif").length,
    totalPangkalan: db.pangkalan.length,
    pendingPayments: pending.length,
    pendingPaymentValue: pending.reduce((s, p) => s + p.nominal, 0),
    previousDayDistributed: distributedOn(yesterday),
    openOrders: db.orders.filter((o) => o.status === "Baru").length,
    lateDeliveries: db.deliveries.filter(
      (d) => d.tanggal === today && d.status === "Tertunda",
    ).length,
  };
}

export async function getMonthlyChart(): Promise<MonthlyChartPoint[]> {
  await latency("read");
  return monthlyProgress();
}

export async function getPangkalanShares(): Promise<PangkalanShare[]> {
  await latency("read");
  return shareByKecamatan();
}

export async function getRecentActivities(): Promise<RecentActivity[]> {
  await latency("read");
  const db = getDb();
  const stageLabel: Record<string, RecentActivity["status"]> = {
    Selesai: "Selesai",
    Proses: "Dalam Pengiriman",
    Antrian: "Pending",
    Tertunda: "Pending",
  };

  return db.deliveries
    .filter((d) => d.tanggal === todayIso())
    .sort((a, b) => b.jamRencana.localeCompare(a.jamRencana))
    .slice(0, 8)
    .map((d) => ({
      id: d.id,
      tanggal: `${new Date(d.tanggal).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })}, ${d.jamRencana}`,
      pangkalan: db.pangkalan.find((p) => p.id === d.pangkalanId)?.nama ?? "—",
      driver: db.drivers.find((x) => x.id === d.driverId)?.nama ?? "—",
      jumlahTabung: d.realisasi || d.target,
      status: stageLabel[d.status] ?? "Pending",
    }));
}

/**
 * The dispatch rail: today's working day as one lane per truck.
 *
 * A stop's width is its planned window (unloading is budgeted at 45 minutes),
 * so a lane reads as a schedule, and the "now" marker shows at a glance which
 * trucks are behind.
 */
export async function getDispatchRail(): Promise<DispatchRail> {
  await latency("read");
  const db = getDb();
  const today = todayIso();
  const now = new Date();

  const dayStart = toMinutes(db.settings.jamOperasionalMulai);
  const dayEnd = toMinutes(db.settings.jamOperasionalSelesai);
  const drops = db.deliveries.filter((d) => d.tanggal === today);

  const lanes: DispatchLane[] = db.drivers
    .filter((driver) => drops.some((d) => d.driverId === driver.id))
    .map((driver) => {
      const mine = drops
        .filter((d) => d.driverId === driver.id)
        .sort((a, b) => a.jamRencana.localeCompare(b.jamRencana));

      return {
        driverId: driver.id,
        driver: driver.nama,
        plat: driver.plat,
        armada: driver.armada,
        kapasitas: driver.kapasitas,
        muatan: mine.reduce((s, d) => s + d.target, 0),
        status: driver.status,
        stops: mine.map((d) => {
          const start = toMinutes(d.jamRencana);
          // Travel plus unloading is budgeted at 90 minutes per stop, which is
          // also what makes a block wide enough to carry a readable label.
          return {
            id: d.id,
            kode: d.kode,
            pangkalan:
              db.pangkalan.find((p) => p.id === d.pangkalanId)?.nama ?? "—",
            kecamatan:
              db.pangkalan.find((p) => p.id === d.pangkalanId)?.kecamatan ?? "—",
            startMinute: start,
            endMinute: start + 90,
            target: d.target,
            realisasi: d.realisasi,
            stage: d.status,
          };
        }),
      };
    })
    .sort((a, b) => {
      const first = (l: DispatchLane) => l.stops[0]?.startMinute ?? 9999;
      return first(a) - first(b);
    });

  return {
    dayStart,
    dayEnd,
    nowMinute: now.getHours() * 60 + now.getMinutes(),
    lanes,
    idleDrivers: db.drivers
      .filter((d) => !drops.some((x) => x.driverId === d.id))
      .map((d) => ({ id: d.id, nama: d.nama, plat: d.plat, status: d.status })),
  };
}

/** Recent entries from the audit trail, for the "who did what" panel. */
export async function getRecentAudit(limit = 6) {
  await latency("read");
  return getDb().audit.slice(0, limit);
}
