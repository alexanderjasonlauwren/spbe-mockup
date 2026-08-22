import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { updateDeliveryStatus } from "@/mocks/rules";
import { DEPOT } from "@/mocks/seed";
import { printDocument } from "@/lib/export";
import { geoVerdict } from "@/lib/geo";
import type {
  DriverCard,
  MonitoringAssignment,
  MonitoringRow,
  MonitoringSnapshot,
} from "../types";

export async function getMonitoringSnapshot(dateRange: {
  from: string;
  to: string;
}): Promise<MonitoringSnapshot> {
  await latency("read");
  const db = scopedDb();

  const drops = db.deliveries
    .filter((d) => d.tanggal >= dateRange.from && d.tanggal <= dateRange.to)
    .sort((a, b) => a.jamRencana.localeCompare(b.jamRencana));

  const radius = db.settings.operasi.radiusGeofenceMeter;

  const rows: MonitoringRow[] = drops.map((d) => {
    const pkl = db.outlets.find((p) => p.id === d.outletId);
    const drv = db.drivers.find((x) => x.id === d.driverId);
    // The latest filing is the one worth showing: an earlier depart from the
    // yard is expected to be far away, a later completion is not.
    const filing = db.deliveryEvents
      .filter((e) => e.deliveryId === d.id && e.tipe !== "berangkat")
      .sort((a, b) => b.at.localeCompare(a.at))[0];
    return {
      lokasi: filing
        ? {
            verdict: geoVerdict(filing.posisi, filing.jarakMeter, radius),
            jarakMeter: filing.jarakMeter,
          }
        : undefined,
      id: d.id,
      kode: d.kode,
      outletId: d.outletId,
      outlet: pkl?.nama ?? "—",
      alamat: pkl ? `Kec. ${pkl.kecamatan}` : "—",
      driverId: d.driverId,
      driver: drv?.nama ?? "—",
      jamRencana: d.jamRencana,
      target: d.target,
      realisasi: d.realisasi,
      pencapaianPersen: d.target === 0 ? 0 : (d.realisasi / d.target) * 100,
      status: d.status,
      coord: { lat: pkl?.lat ?? -6.24, lng: pkl?.lng ?? 107.0 },
      catatan: d.catatan,
    };
  });

  // Colour slot is assigned across the day's crew, not the whole roster: with
  // eight drivers and five hues, roster indices would collide and put two of
  // today's trucks on the same colour. The crew is fixed by the date range, so
  // filtering the board downstream never repaints the survivors.
  const crew = db.drivers.filter((driver) =>
    drops.some((d) => d.driverId === driver.id),
  );
  const slotOf = new Map(crew.map((d, i) => [d.id, i]));

  const drivers: DriverCard[] = crew
    .map((driver) => {
      const mine = drops.filter((d) => d.driverId === driver.id);
      const running = mine.find((d) => d.status === "Proses");
      const target = running
        ? db.outlets.find((p) => p.id === running.outletId)
        : undefined;

      return {
        id: driver.id,
        name: driver.nama,
        slot: slotOf.get(driver.id) ?? 0,
        plat: driver.plat,
        armada: driver.armada,
        kapasitas: driver.kapasitas,
        status: driver.status,
        muatan: mine.reduce((s, d) => s + d.target, 0),
        tujuanOutlet: target?.nama,
        eta: running ? `${running.jamRencana} WIB` : undefined,
        lokasi: driver.status === "Standby" ? "Pool Bekasi" : target?.kecamatan,
        durasi: driver.status === "Bongkar Muat" ? "±15 menit" : undefined,
        selesai: mine.filter((d) => d.status === "Selesai").length,
        total: mine.length,
      };
    });

  // One assignment per truck, not per stop: the map draws the whole round so a
  // standby truck still shows the route it is about to drive.
  const assignments: MonitoringAssignment[] = drivers
    .map((driver, index) => {
      const mine = drops
        .filter((d) => d.driverId === driver.id)
        .sort((a, b) => a.jamRencana.localeCompare(b.jamRencana));
      if (mine.length === 0) return null;

      const running = mine.find((d) => d.status === "Proses");
      const remaining = mine.filter((d) => d.status !== "Selesai");
      const coordOf = (outletId: string) => {
        const pkl = db.outlets.find((p) => p.id === outletId);
        return { lat: pkl?.lat ?? DEPOT.lat, lng: pkl?.lng ?? DEPOT.lng };
      };

      // Where the truck is: its live position if moving, the last drop it made
      // if the round is done, otherwise still in the yard.
      const lastDone = [...mine].reverse().find((d) => d.status === "Selesai");

      // Trucks waiting in the yard share one coordinate, so their pins would
      // stack into a single unreadable marker. Fan them around the yard.
      const angle = (index / Math.max(1, drivers.length)) * Math.PI * 2;
      const parked = {
        lat: DEPOT.lat + Math.sin(angle) * 0.006,
        lng: DEPOT.lng + Math.cos(angle) * 0.006,
      };

      const driverCoord =
        running && running.driverLat != null && running.driverLng != null
          ? { lat: running.driverLat, lng: running.driverLng }
          : lastDone && remaining.length === 0
            ? coordOf(lastDone.outletId)
            : parked;

      const target = remaining[0] ?? mine[mine.length - 1];

      return {
        id: driver.id,
        driverId: driver.id,
        outletId: target.outletId,
        driverCoord,
        stops: (remaining.length > 0 ? remaining : mine).map((d) =>
          coordOf(d.outletId),
        ),
        berjalan: !!running,
        selesai: remaining.length === 0,
      } satisfies MonitoringAssignment;
    })
    .filter((a): a is MonitoringAssignment => a !== null);

  return {
    drivers,
    rows,
    assignments,
    lastSyncAt: new Date().toISOString(),
    totals: {
      target: rows.reduce((s, r) => s + r.target, 0),
      realisasi: rows.reduce((s, r) => s + r.realisasi, 0),
      selesai: rows.filter((r) => r.status === "Selesai").length,
      proses: rows.filter((r) => r.status === "Proses").length,
      antrian: rows.filter((r) => r.status === "Antrian").length,
      tertunda: rows.filter((r) => r.status === "Tertunda").length,
    },
  };
}

export async function getDriverCards(dateRange: { from: string; to: string }) {
  return (await getMonitoringSnapshot(dateRange)).drivers;
}

export async function getMonitoringTable(dateRange: { from: string; to: string }) {
  return (await getMonitoringSnapshot(dateRange)).rows;
}

/** Records what actually happened at a stop. */
export async function setDeliveryStatus(input: {
  deliveryId: string;
  status: "Antrian" | "Proses" | "Selesai" | "Tertunda";
  realisasi?: number;
}) {
  await latency("write");
  return updateDeliveryStatus(input.deliveryId, input.status, input.realisasi);
}

/** Prints the surat jalan carried with the load. */
export async function printSuratJalan(deliveryId: string): Promise<void> {
  await latency("read");
  const db = scopedDb();
  const d = db.deliveries.find((x) => x.id === deliveryId);
  if (!d) throw new Error("Surat jalan tidak ditemukan.");

  const pkl = db.outlets.find((p) => p.id === d.outletId);
  const drv = db.drivers.find((x) => x.id === d.driverId);
  const fmt = (n: number) => n.toLocaleString("id-ID");

  printDocument(
    `${d.kode} — Surat Jalan`,
    `
    <p class="eyebrow">${db.settings.namaPerusahaan} · Agen ${db.settings.nomorAgen}</p>
    <h1>Surat Jalan</h1>
    <hr class="rule" />
    <div class="meta">
      <div>Nomor<strong class="code">${d.kode}</strong></div>
      <div>Tanggal<strong>${new Date(d.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</strong></div>
      <div>Jam rencana<strong class="code">${d.jamRencana}</strong></div>
      <div>Status<strong>${d.status}</strong></div>
    </div>
    <table>
      <thead><tr><th>Tujuan</th><th>Armada</th><th style="text-align:right">Target</th><th style="text-align:right">Realisasi</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>${pkl?.nama ?? "—"}</strong><br />${pkl ? `${pkl.alamat}, Kec. ${pkl.kecamatan}` : ""}<br />${pkl?.penanggungJawab ?? ""} · ${pkl?.telepon ?? ""}</td>
          <td>${drv?.nama ?? "—"}<br /><span class="code">${drv?.plat ?? ""}</span><br />${drv?.armada ?? ""}</td>
          <td class="num">${fmt(d.target)}</td>
          <td class="num">${fmt(d.realisasi)}</td>
        </tr>
      </tbody>
    </table>
    ${d.catatan ? `<p style="margin-top:12px"><strong>Catatan:</strong> ${d.catatan}</p>` : ""}
    <div class="sign">
      <div>Pengirim<span>${drv?.nama ?? ""}</span></div>
      <div>Penerima<span>${pkl?.penanggungJawab ?? ""}</span></div>
    </div>`,
  );
}
