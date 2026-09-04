/**
 * The driver's day, against the real API.
 *
 * # One visit, several documents
 *
 * The service issues one surat jalan per product: a pangkalan taking 3 kg and
 * 12 kg in one drop has two. The driver still parks once, so `GET
 * /deliveries/mine` returns them already grouped into stops — the grouping
 * lives on the server so a second client cannot group differently.
 *
 * That leaves this adapter with the write side of the same fact. A stop the
 * driver closes once fans out into one call per document, because that is
 * where the accountability sits: a refusal, a shortfall and an invoice are all
 * per product. `stopIndex` remembers which documents a stop was built from, so
 * the fan-out uses ids the server gave us rather than ids assembled here.
 *
 * # Position
 *
 * Every filing carries the phone's fix when there is one. The read happens
 * before the request, so a slow GPS delays the submission rather than losing
 * it — same order as the mock, for the same reason.
 */
import { getOne, send } from "@/lib/api";
import { capturePosition } from "@/lib/geo";
import { unitLabel } from "@/lib/lexicon";
import type { CompleteStopInput, SopirApi, StopReceipt } from "./contract";
import type { DriverOption, DriverRun, RunStop, StopLine } from "../types";

/** Mirrors the backend's DeliveryResponse. */
interface DeliveryResponse {
  id: string;
  delivery_number: string;
  product_id?: string;
  product_name?: string;
  dispatched_qty: number;
  delivered_qty: number;
  returned_qty: number;
  empties_collected: number;
  departed_at?: string;
  arrived_at?: string;
  completed_at?: string;
  delivery_status: string;
  failure_reason?: string;
  notes?: string;
  version: number;
}

/** Mirrors the backend's RunStopResponse. */
interface StopResponse {
  sequence_no: number;
  outlet_id?: string;
  outlet_code?: string;
  outlet_name?: string;
  owner_name?: string;
  phone?: string;
  address?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  deliveries: DeliveryResponse[];
}

/** Mirrors the backend's MyRunResponse. */
interface RunResponse {
  date: string;
  driver_id?: string;
  driver_name?: string;
  vehicle_id?: string;
  plate?: string;
  stops: StopResponse[];
}

interface VehicleResponse {
  vehicle_type: string;
  capacity_qty: number;
}

/**
 * What each stop was built from, keyed by the stop id the screen holds.
 *
 * Populated by every `getMyRun`, which the screen always runs before it can
 * offer a button — there is nothing to press until a run has been drawn. A
 * miss is therefore a bug rather than a stale cache, and it throws instead of
 * guessing: filing against the wrong surat jalan is worse than not filing.
 */
const stopIndex = new Map<string, DeliveryResponse[]>();

/**
 * A document is still open if nothing has settled it.
 *
 * A stop can be half closed — one product filed, the other not — whenever a
 * fan-out stopped part way. Filing against the settled half answers "this drop
 * is already partial and cannot be filed against again" and takes the rest of
 * the stop down with it, leaving the driver with a button that can never work.
 */
function isOpen(row: DeliveryResponse): boolean {
  return !row.completed_at && row.delivery_status !== "failed";
}

function documentsFor(stopId: string): DeliveryResponse[] {
  const found = stopIndex.get(stopId);
  if (!found?.length) {
    throw new Error(
      "Surat jalan untuk perhentian ini belum dimuat. Muat ulang rute Anda.",
    );
  }
  return found;
}

/**
 * The stage the driver's card shows.
 *
 * Read off the timestamps rather than `delivery_status`, because they answer
 * the question the card asks. `partial` is a settled drop the outlet took some
 * of — from the driver's side that is done, and the shortfall is already in
 * the numbers under it.
 */
function toStage(rows: DeliveryResponse[]): RunStop["status"] {
  if (rows.some((r) => r.delivery_status === "failed")) return "Tertunda";
  if (rows.every((r) => r.completed_at)) return "Selesai";
  if (rows.some((r) => r.departed_at)) return "Proses";
  return "Antrian";
}

function toLine(row: DeliveryResponse): StopLine {
  return {
    productId: row.product_id ?? "",
    nama: row.product_name ?? "Produk tidak dikenal",
    // The service does not carry a per-product unit or a returnable flag on a
    // delivery. The console's configured unit is the honest stand-in, and
    // anything the outlet hands back is counted whether or not a flag says it
    // may be — `empties_collected` is a fact, not a permission.
    satuan: unitLabel(),
    returnable: row.empties_collected > 0 || row.returned_qty > 0,
    target: row.dispatched_qty,
    realisasi: row.delivered_qty,
    kembali: row.returned_qty || undefined,
  };
}

function toStop(stop: StopResponse, urutan: number): RunStop {
  const rows = stop.deliveries;
  // The first document's id names the stop. A real id, not a synthetic key:
  // it survives a reload and it is one the server would recognise.
  const id = rows[0]?.id ?? `stop-${stop.sequence_no}`;
  stopIndex.set(id, rows);

  const sum = (pick: (r: DeliveryResponse) => number) =>
    rows.reduce((total, r) => total + pick(r), 0);
  const empties = sum((r) => r.empties_collected);
  const recipient = rows.find((r) => r.notes)?.notes;

  return {
    id,
    // Every document the outlet signs for, because there may be more than one
    // and the driver hands over all of them.
    kode: rows.map((r) => r.delivery_number).join(", "),
    urutan,
    outletId: stop.outlet_id ?? "",
    outlet: stop.outlet_name ?? "—",
    alamat: stop.address ?? "—",
    kecamatan: stop.district ?? "—",
    telepon: stop.phone ?? "",
    penanggungJawab: stop.owner_name ?? "",
    lat: stop.latitude ?? 0,
    lng: stop.longitude ?? 0,
    // The plan carries no clock time per stop, only a position in the run.
    jamRencana: "",
    lines: rows.map(toLine),
    target: sum((r) => r.dispatched_qty),
    realisasi: sum((r) => r.delivered_qty),
    unitKembali: empties || undefined,
    status: toStage(rows),
    catatan: rows.find((r) => r.failure_reason)?.failure_reason ?? recipient,
    selesaiPada: rows.find((r) => r.completed_at)?.completed_at,
    // Filings come from each document's own event log, which is a request per
    // stop. The card renders without them, so they are not fetched here.
    filings: [],
  };
}

async function getMyRun(_driverId: string, tanggal?: string): Promise<DriverRun> {
  const query = tanggal ? `?date=${encodeURIComponent(tanggal)}` : "";
  const run = await getOne<RunResponse>(`/deliveries/mine${query}`);

  stopIndex.clear();
  const stops = run.stops.map((s, i) => toStop(s, i + 1));

  // The truck's type and ceiling are the fleet's, not the run's, so they cost
  // one more request — and only when the run actually has a vehicle on it.
  let armada = "—";
  let kapasitas = 0;
  if (run.vehicle_id) {
    try {
      const vehicle = await getOne<VehicleResponse>(`/vehicles/${run.vehicle_id}`);
      armada = vehicle.vehicle_type;
      kapasitas = vehicle.capacity_qty;
    } catch {
      // A fleet read that fails must not cost the driver their route. The
      // header loses a label; every stop still renders.
    }
  }

  const open = stops.filter((s) => s.status !== "Selesai" && s.status !== "Tertunda");

  return {
    // The service records a position on every filing it is given one for.
    rekamLokasi: true,
    driver: run.driver_id
      ? {
          id: run.driver_id,
          nama: run.driver_name ?? "—",
          plat: run.plate ?? "—",
          armada,
          kapasitas,
          status: open.length ? "Bertugas" : "Standby",
        }
      : null,
    tanggal: run.date,
    stops,
    totals: {
      singgah: stops.length,
      selesai: stops.filter((s) => s.status === "Selesai").length,
      tertunda: stops.filter((s) => s.status === "Tertunda").length,
      sisa: open.length,
      muatan: stops.reduce((t, s) => t + s.target, 0),
      terkirim: stops.reduce((t, s) => t + s.realisasi, 0),
      kembali: stops.reduce((t, s) => t + (s.unitKembali ?? 0), 0),
      kapasitas,
    },
    // A drop already under way outranks the next queued one.
    stopBerikutId:
      stops.find((s) => s.status === "Proses")?.id ??
      stops.find((s) => s.status === "Antrian")?.id ??
      null,
  };
}

/** A filed position, or nothing at all — a phone with no fix must still file. */
type Fix = { latitude: number; longitude: number } | Record<string, never>;

/** The phone's fix, read before the write so a slow GPS delays rather than loses. */
async function position(): Promise<Fix> {
  const fix = await capturePosition({ aktif: true });
  return fix.lat != null && fix.lng != null
    ? { latitude: fix.lat, longitude: fix.lng }
    : {};
}

/** What the screen shows back after a filing: the documents, and the count. */
function receipt(rows: DeliveryResponse[], realisasi: number): StopReceipt {
  return { kode: rows.map((r) => r.delivery_number).join(", "), realisasi };
}

async function departStop(deliveryId: string): Promise<StopReceipt> {
  const rows = documentsFor(deliveryId);
  const at = await position();
  // Sequential, not concurrent: each call carries the version it read, and the
  // server's own error is more useful than whichever of five parallel
  // rejections happened to land first.
  for (const row of rows.filter((r) => isOpen(r) && !r.departed_at)) {
    await send("post", `/deliveries/${row.id}/depart`, { version: row.version, ...at });
  }
  return receipt(rows, 0);
}

/**
 * Closing a stop.
 *
 * No separate arrival call: the service stamps arrived_at itself when the
 * driver never filed one, in the same write and from the same instant. The
 * console has always had two buttons — pressing "I am here" and then "here is
 * what they took" is one action at one gate — and this keeps it that way.
 *
 * The cost is that the wait at the gate reads as nothing. An agency that wants
 * that gap measured needs a "Tiba" button, which is a change to what the
 * driver is asked to do rather than something to infer here.
 */
async function completeStop(input: CompleteStopInput): Promise<StopReceipt> {
  const rows = documentsFor(input.deliveryId);
  const at = await position();
  const filed = new Map(input.lines.map((l) => [l.productId, l]));

  let realisasi = 0;
  for (const row of rows.filter(isOpen)) {
    const line = filed.get(row.product_id ?? "");
    // A document the driver did not file against is closed at what it carried:
    // leaving it open would hold the whole stop open, and the count they did
    // not change is the count that left the yard.
    const delivered = line ? line.realisasi : row.dispatched_qty;
    realisasi += delivered;
    await send("post", `/deliveries/${row.id}/complete`, {
      version: row.version,
      delivered_qty: delivered,
      returned_qty: Math.max(0, row.dispatched_qty - delivered),
      empties_collected: line?.kembali ?? 0,
      recipient_name: input.diterimaOleh,
      note: input.catatan,
      ...at,
    });
  }
  return receipt(rows, realisasi);
}

async function holdStop(input: { deliveryId: string; catatan: string }): Promise<StopReceipt> {
  const rows = documentsFor(input.deliveryId);
  const at = await position();
  for (const row of rows.filter(isOpen)) {
    await send("post", `/deliveries/${row.id}/fail`, {
      version: row.version,
      failure_reason: input.catatan,
      ...at,
    });
  }
  return receipt(rows, 0);
}

/**
 * There is no fleet list to offer: the run comes from the session, so an
 * account that is not a driver has no other driver's day to switch to. The
 * picker the mock backs is a demo affordance, and an empty list is what makes
 * the screen hide it rather than show a control that cannot work.
 */
async function getDriverOptions(): Promise<DriverOption[]> {
  return [];
}

export const sopirApiHttp: SopirApi = {
  getMyRun,
  departStop,
  completeStop,
  holdStop,
  getDriverOptions,
};
