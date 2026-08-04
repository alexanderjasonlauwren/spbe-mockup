import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { exportCsv, printDocument, timestampSuffix } from "@/lib/export";
import { addDays, isoDate, startOfToday } from "@/mocks/seed";

export type ReportRange = "7h" | "30h" | "bulan-ini" | "bulan-lalu";

export const RANGE_LABEL: Record<ReportRange, string> = {
  "7h": "7 hari terakhir",
  "30h": "30 hari terakhir",
  "bulan-ini": "Bulan berjalan",
  "bulan-lalu": "Bulan lalu",
};

export function resolveRange(range: ReportRange): { from: string; to: string } {
  const today = startOfToday();
  switch (range) {
    case "7h":
      return { from: isoDate(addDays(today, -6)), to: isoDate(today) };
    case "30h":
      return { from: isoDate(addDays(today, -29)), to: isoDate(today) };
    case "bulan-lalu": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: isoDate(first), to: isoDate(last) };
    }
    case "bulan-ini":
    default: {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: isoDate(first), to: isoDate(today) };
    }
  }
}

export interface ReportSummary {
  range: { from: string; to: string };
  tabungTerkirim: number;
  tabungTarget: number;
  pencapaian: number;
  pendapatan: number;
  piutang: number;
  ditolak: number;
  suratJalan: number;
  suratJalanSelesai: number;
  suratJalanTertunda: number;
  pangkalanDilayani: number;
  rerataPerHari: number;
}

export interface DailyPoint {
  tanggal: string;
  target: number;
  realisasi: number;
  pendapatan: number;
}

export async function getReportSummary(range: ReportRange): Promise<ReportSummary> {
  await latency("read");
  const db = scopedDb();
  const window = resolveRange(range);

  const drops = db.deliveries.filter(
    (d) => d.tanggal >= window.from && d.tanggal <= window.to,
  );
  const payments = db.payments.filter(
    (p) => p.tanggal >= window.from && p.tanggal <= window.to,
  );
  const invoices = db.invoices.filter(
    (i) => i.tanggal >= window.from && i.tanggal <= window.to,
  );

  const realisasi = drops.reduce((s, d) => s + d.realisasi, 0);
  const target = drops.reduce((s, d) => s + d.target, 0);
  const days =
    Math.max(
      1,
      Math.round(
        (new Date(window.to).getTime() - new Date(window.from).getTime()) / 86_400_000,
      ) + 1,
    );

  return {
    range: window,
    tabungTerkirim: realisasi,
    tabungTarget: target,
    pencapaian: target === 0 ? 0 : (realisasi / target) * 100,
    pendapatan: payments
      .filter((p) => p.status === "Terverifikasi")
      .reduce((s, p) => s + p.jumlah, 0),
    piutang: invoices.reduce((s, i) => s + (i.total - i.terbayar - i.kredit), 0),
    ditolak: payments
      .filter((p) => p.status === "Ditolak")
      .reduce((s, p) => s + p.jumlah, 0),
    suratJalan: drops.length,
    suratJalanSelesai: drops.filter((d) => d.status === "Selesai").length,
    suratJalanTertunda: drops.filter((d) => d.status === "Tertunda").length,
    pangkalanDilayani: new Set(drops.map((d) => d.pangkalanId)).size,
    rerataPerHari: Math.round(realisasi / days),
  };
}

export async function getDailySeries(range: ReportRange): Promise<DailyPoint[]> {
  await latency("read");
  const db = scopedDb();
  const window = resolveRange(range);
  const points = new Map<string, DailyPoint>();

  for (
    let d = new Date(window.from);
    isoDate(d) <= window.to;
    d = addDays(d, 1)
  ) {
    points.set(isoDate(d), {
      tanggal: isoDate(d),
      target: 0,
      realisasi: 0,
      pendapatan: 0,
    });
  }

  for (const drop of db.deliveries) {
    const point = points.get(drop.tanggal);
    if (!point) continue;
    point.target += drop.target;
    point.realisasi += drop.realisasi;
  }
  for (const p of db.payments) {
    if (p.status !== "Terverifikasi") continue;
    const point = points.get(p.tanggal);
    if (point) point.pendapatan += p.jumlah;
  }

  return [...points.values()];
}

export async function getTopPangkalan(range: ReportRange, limit = 8) {
  await latency("read");
  const db = scopedDb();
  const window = resolveRange(range);
  const totals = new Map<string, { tabung: number; suratJalan: number }>();

  for (const d of db.deliveries) {
    if (d.tanggal < window.from || d.tanggal > window.to) continue;
    const row = totals.get(d.pangkalanId) ?? { tabung: 0, suratJalan: 0 };
    row.tabung += d.realisasi;
    row.suratJalan += 1;
    totals.set(d.pangkalanId, row);
  }

  return [...totals.entries()]
    .map(([id, v]) => {
      const pkl = db.pangkalan.find((p) => p.id === id);
      return {
        id,
        nama: pkl?.nama ?? "—",
        kecamatan: pkl?.kecamatan ?? "—",
        tabung: v.tabung,
        suratJalan: v.suratJalan,
        nilai: v.tabung * db.settings.hargaPerTabung,
      };
    })
    .sort((a, b) => b.tabung - a.tabung)
    .slice(0, limit);
}

export async function getDriverPerformance(range: ReportRange) {
  await latency("read");
  const db = scopedDb();
  const window = resolveRange(range);

  return db.drivers
    .map((driver) => {
      const mine = db.deliveries.filter(
        (d) =>
          d.driverId === driver.id &&
          d.tanggal >= window.from &&
          d.tanggal <= window.to,
      );
      const closed = mine.filter(
        (d) => d.status === "Selesai" || d.status === "Tertunda",
      );
      return {
        id: driver.id,
        nama: driver.nama,
        plat: driver.plat,
        armada: driver.armada,
        suratJalan: mine.length,
        selesai: mine.filter((d) => d.status === "Selesai").length,
        tertunda: mine.filter((d) => d.status === "Tertunda").length,
        tabung: mine.reduce((s, d) => s + d.realisasi, 0),
        ketepatan:
          closed.length === 0
            ? 0
            : (closed.filter((d) => d.status === "Selesai").length / closed.length) * 100,
      };
    })
    .filter((d) => d.suratJalan > 0)
    .sort((a, b) => b.tabung - a.tabung);
}

export async function exportReport(range: ReportRange) {
  await latency("read");
  const series = await getDailySeries(range);
  exportCsv(
    `laporan-${range}-${timestampSuffix()}`,
    ["Tanggal", "Target (tabung)", "Realisasi (tabung)", "Pendapatan (Rp)"],
    series.map((p) => [
      new Date(p.tanggal).toLocaleDateString("id-ID"),
      p.target,
      p.realisasi,
      p.pendapatan,
    ]),
  );
  return series.length;
}

/** The printable monthly recap the agency files. */
export async function printReport(range: ReportRange) {
  await latency("read");
  const db = scopedDb();
  const summary = await getReportSummary(range);
  const top = await getTopPangkalan(range, 10);
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const rupiah = (n: number) => `Rp ${fmt(n)}`;
  const tanggal = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  printDocument(
    `Laporan ${RANGE_LABEL[range]}`,
    `
    <p class="eyebrow">${db.settings.namaPerusahaan} · Agen ${db.settings.nomorAgen}</p>
    <h1>Rekapitulasi Distribusi &amp; Keuangan</h1>
    <hr class="rule" />
    <div class="meta">
      <div>Periode<strong>${tanggal(summary.range.from)} – ${tanggal(summary.range.to)}</strong></div>
      <div>Surat jalan<strong>${fmt(summary.suratJalan)}</strong></div>
      <div>Pangkalan dilayani<strong>${fmt(summary.pangkalanDilayani)}</strong></div>
      <div>Dicetak<strong>${new Date().toLocaleString("id-ID")}</strong></div>
    </div>

    <table>
      <thead><tr><th>Ringkasan</th><th style="text-align:right">Nilai</th></tr></thead>
      <tbody>
        <tr><td>Tabung terkirim</td><td class="num">${fmt(summary.tabungTerkirim)}</td></tr>
        <tr><td>Target periode</td><td class="num">${fmt(summary.tabungTarget)}</td></tr>
        <tr><td>Pencapaian</td><td class="num">${summary.pencapaian.toFixed(1)}%</td></tr>
        <tr><td>Rata-rata per hari</td><td class="num">${fmt(summary.rerataPerHari)}</td></tr>
        <tr><td>Pendapatan terverifikasi</td><td class="num">${rupiah(summary.pendapatan)}</td></tr>
        <tr><td>Piutang menunggu verifikasi</td><td class="num">${rupiah(summary.piutang)}</td></tr>
      </tbody>
      <tfoot><tr><td>Surat jalan tertunda</td><td class="num">${fmt(summary.suratJalanTertunda)}</td></tr></tfoot>
    </table>

    <table>
      <thead><tr><th>Pangkalan</th><th>Kecamatan</th><th style="text-align:right">Surat jalan</th><th style="text-align:right">Tabung</th><th style="text-align:right">Nilai</th></tr></thead>
      <tbody>
        ${top
          .map(
            (t) =>
              `<tr><td>${t.nama}</td><td>${t.kecamatan}</td><td class="num">${fmt(t.suratJalan)}</td><td class="num">${fmt(t.tabung)}</td><td class="num">${rupiah(t.nilai)}</td></tr>`,
          )
          .join("")}
      </tbody>
    </table>

    <div class="sign">
      <div>Disusun oleh<span></span></div>
      <div>Disetujui oleh<span></span></div>
    </div>`,
  );
}
