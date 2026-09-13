/**
 * Read-side helpers shared by the feature APIs.
 *
 * Anything that joins collections or aggregates lives here, so the same number
 * (today's tonnage, a outlet's name, quota left on an SA) is computed one
 * way for every page that shows it.
 */

import { scopedDb } from "./scope";
import { addDays, isoDate, startOfToday } from "./seed";
import type {
  DeliveryEntity,
  Database,
  ID,
  OutletEntity,
  DriverEntity,
} from "./types";

/** Always the scoped view — these selectors feed the dashboard and reports. */
export function db(): Database {
  return scopedDb();
}

export function todayIso(): string {
  return isoDate(startOfToday());
}

export function outletById(id: ID | null): OutletEntity | undefined {
  if (!id) return undefined;
  return scopedDb().outlets.find((p) => p.id === id);
}

export function outletName(id: ID | null): string {
  return outletById(id)?.nama ?? "—";
}

export function driverById(id: ID | null): DriverEntity | undefined {
  if (!id) return undefined;
  return scopedDb().drivers.find((d) => d.id === id);
}

export function driverName(id: ID | null): string {
  return driverById(id)?.nama ?? "Belum ditetapkan";
}

export function deliveriesOn(date: string): DeliveryEntity[] {
  return scopedDb().deliveries.filter((d) => d.tanggal === date);
}

export function deliveriesBetween(from: string, to: string): DeliveryEntity[] {
  return scopedDb().deliveries.filter((d) => d.tanggal >= from && d.tanggal <= to);
}

/** The SA backing today's operations — the one quota is currently drawn from. */
export function activeSa() {
  const d = scopedDb();
  const today = todayIso();
  return (
    d.scheduleAgreements.find(
      (s) =>
        s.status !== "Draft" &&
        s.periodeMulai <= today &&
        s.periodeBerakhir >= today &&
        s.terpakai < s.totalKuota,
    ) ?? d.scheduleAgreements.find((s) => s.status === "Aktif")
  );
}

/** Quota totals for the current calendar month across all live SAs. */
export function monthlyQuota() {
  const d = scopedDb();
  const today = todayIso();
  const live = d.scheduleAgreements.filter(
    (s) =>
      s.status !== "Draft" &&
      s.periodeMulai <= today &&
      s.periodeBerakhir >= today,
  );
  const total = live.reduce((s, x) => s + x.totalKuota, 0);
  const terpakai = live.reduce((s, x) => s + x.terpakai, 0);
  return { total, terpakai, sisa: Math.max(0, total - terpakai), agreements: live };
}

export function distributedOn(date: string): number {
  return deliveriesOn(date).reduce((s, d) => s + d.realisasi, 0);
}

export function targetOn(date: string): number {
  return deliveriesOn(date).reduce((s, d) => s + d.target, 0);
}

/** Week-by-week realisation against target for the current month. */
export function monthlyProgress() {
  const d = scopedDb();
  const now = startOfToday();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const buckets = Array.from({ length: Math.ceil(last.getDate() / 7) }, (_, i) => ({
    week: `Minggu ${i + 1}`,
    target: 0,
    realisasi: 0,
  }));

  for (const dl of d.deliveries) {
    if (dl.tanggal < isoDate(first) || dl.tanggal > isoDate(last)) continue;
    const day = new Date(dl.tanggal).getDate();
    const bucket = buckets[Math.min(buckets.length - 1, Math.floor((day - 1) / 7))];
    bucket.target += dl.target;
    bucket.realisasi += dl.realisasi;
  }
  return buckets;
}

/** Share of this month's realised tonnage per kecamatan. */
export function shareByKecamatan(limit = 4) {
  const d = scopedDb();
  const now = startOfToday();
  const first = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));

  const totals = new Map<string, number>();
  for (const dl of d.deliveries) {
    if (dl.tanggal < first) continue;
    const pkl = d.outlets.find((p) => p.id === dl.outletId);
    if (!pkl) continue;
    totals.set(pkl.kecamatan, (totals.get(pkl.kecamatan) ?? 0) + dl.realisasi);
  }

  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const restValue = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);
  if (restValue > 0) top.push(["Wilayah lain", restValue]);

  const grand = top.reduce((s, [, v]) => s + v, 0) || 1;
  return top.map(([name, value]) => ({
    name,
    value,
    percentage: Math.round((value / grand) * 100),
  }));
}

/** Rolling window used by the reports page. */
export function rangeDays(days: number) {
  const to = startOfToday();
  const from = addDays(to, -(days - 1));
  return { from: isoDate(from), to: isoDate(to) };
}
