import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { updateDeliveryStatus } from "@/mocks/rules";
import { todayIso } from "@/mocks/selectors";
import { capturePosition, geoVerdict } from "@/lib/geo";
import { productOf } from "@/mocks/lines";
import type {
  DriverOption,
  DriverRun,
  RunStop,
  StopFiling,
  StopLine,
} from "../types";

/**
 * Reads the fix before the write, so a slow GPS delays the submission rather
 * than losing it — the mutation is not started until the coordinate is settled
 * one way or the other, and `capturePosition` is bounded and never rejects.
 */
async function stamp() {
  const { operasi } = scopedDb().settings;
  return capturePosition({ aktif: operasi.rekamLokasi });
}

/**
 * One driver's run for a day.
 *
 * Reads through `scopedDb`, so a sopir cannot see another branch even by
 * guessing an id — the same narrowing every other feature gets, rather than a
 * filter this module remembers to apply.
 */
export async function getMyRun(
  driverId: string,
  tanggal?: string,
): Promise<DriverRun> {
  await latency("read");
  const db = scopedDb();
  const date = tanggal ?? todayIso();
  const driver = db.drivers.find((d) => d.id === driverId);

  const radius = db.settings.operasi.radiusGeofenceMeter;

  const stops: RunStop[] = db.deliveries
    .filter((d) => d.driverId === driverId && d.tanggal === date)
    .sort((a, b) => a.jamRencana.localeCompare(b.jamRencana))
    .map((d, i) => {
      const pkl = db.outlets.find((p) => p.id === d.outletId);
      const filings: StopFiling[] = db.deliveryEvents
        .filter((e) => e.deliveryId === d.id)
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((e) => ({
          tipe: e.tipe,
          at: e.at,
          posisi: e.posisi,
          jarakMeter: e.jarakMeter,
          verdict: geoVerdict(e.posisi, e.jarakMeter, radius),
        }));
      const lines: StopLine[] = d.lines.map((l) => {
        const prod = productOf(db.products, l.productId);
        return {
          productId: l.productId,
          nama: prod?.nama ?? "Produk tidak dikenal",
          satuan: prod?.satuan ?? "unit",
          returnable: prod?.returnable ?? false,
          target: l.target,
          realisasi: l.realisasi,
          kembali: l.kembali,
        };
      });

      return {
        filings,
        lines,
        id: d.id,
        kode: d.kode,
        urutan: i + 1,
        outletId: d.outletId,
        outlet: pkl?.nama ?? "—",
        alamat: pkl?.alamat ?? "—",
        kecamatan: pkl?.kecamatan ?? "—",
        telepon: pkl?.telepon ?? "",
        penanggungJawab: pkl?.penanggungJawab ?? "",
        lat: pkl?.lat ?? 0,
        lng: pkl?.lng ?? 0,
        jamRencana: d.jamRencana,
        target: d.target,
        realisasi: d.realisasi,
        unitKembali: d.unitKembali,
        diterimaOleh: d.diterimaOleh,
        status: d.status,
        catatan: d.catatan,
        selesaiPada: d.selesaiPada,
      };
    });

  const terbuka = stops.filter(
    (s) => s.status !== "Selesai" && s.status !== "Tertunda",
  );

  return {
    rekamLokasi: db.settings.operasi.rekamLokasi,
    driver: driver
      ? {
          id: driver.id,
          nama: driver.nama,
          plat: driver.plat,
          armada: driver.armada,
          kapasitas: driver.kapasitas,
          status: driver.status,
        }
      : null,
    tanggal: date,
    stops,
    totals: {
      singgah: stops.length,
      selesai: stops.filter((s) => s.status === "Selesai").length,
      tertunda: stops.filter((s) => s.status === "Tertunda").length,
      sisa: terbuka.length,
      muatan: stops.reduce((sum, s) => sum + s.target, 0),
      terkirim: stops.reduce((sum, s) => sum + s.realisasi, 0),
      kembali: stops.reduce((sum, s) => sum + (s.unitKembali ?? 0), 0),
      kapasitas: driver?.kapasitas ?? 0,
    },
    // A drop already under way outranks the next queued one: that is where the
    // truck physically is.
    stopBerikutId:
      terbuka.find((s) => s.status === "Proses")?.id ?? terbuka[0]?.id ?? null,
  };
}

/** Leaving for the stop. Starts the clock the desk sees on the rail. */
export async function departStop(deliveryId: string) {
  const posisi = await stamp();
  await latency("write");
  return updateDeliveryStatus(deliveryId, "Proses", undefined, { posisi });
}

/**
 * Closing a drop.
 *
 * `realisasi` is the number the invoice is raised from, so it is the sopir's
 * word that becomes the outlet's bill — which is why it is typed in rather than
 * assumed from the target.
 */
export async function completeStop(input: {
  deliveryId: string;
  /** Per product — the sopir unloaded it, so they know the breakdown. */
  lines: { productId: string; realisasi: number; kembali?: number }[];
  diterimaOleh: string;
  catatan?: string;
}) {
  const posisi = await stamp();
  await latency("write");
  return updateDeliveryStatus(input.deliveryId, "Selesai", undefined, {
    lines: input.lines,
    diterimaOleh: input.diterimaOleh,
    catatan: input.catatan,
    posisi,
  });
}

/** Could not deliver. Leaves the surat jalan open and raises no invoice. */
export async function holdStop(input: { deliveryId: string; catatan: string }) {
  const posisi = await stamp();
  await latency("write");
  return updateDeliveryStatus(input.deliveryId, "Tertunda", undefined, {
    catatan: input.catatan,
    posisi,
  });
}

/**
 * Fleet list for accounts that are not themselves a sopir.
 *
 * A dispatcher covering the radio, or an admin checking what the driver sees,
 * still needs to open this page — and an account with no fleet link would
 * otherwise hit a dead end it cannot resolve.
 */
export async function getDriverOptions(): Promise<DriverOption[]> {
  await latency("read");
  return scopedDb()
    .drivers.filter((d) => d.status !== "Cuti")
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .map((d) => ({
      id: d.id,
      label: d.nama,
      sublabel: `${d.plat} · ${d.armada}`,
    }));
}
