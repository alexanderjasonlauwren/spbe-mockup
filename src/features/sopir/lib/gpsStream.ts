/**
 * A continuous position stream, for a driver who chose to share their route.
 *
 * `@/lib/geo.ts` corroborates a single filing and nothing more — a fix taken
 * at the moment a drop is submitted, never watched continuously. This module
 * is the different thing that comment reserves for "a different conversation
 * with the people driving the trucks": that conversation happened, and the
 * answer is `useGpsStream`'s start/pause toggle, off by default, which the
 * driver presses themselves. This module never starts on its own — it only
 * runs the stream once something else has decided to.
 *
 * Framework-free and independently testable: every browser dependency is
 * injected, so a fake clock and a fake geolocation object can drive it
 * without a DOM.
 */
import { distanceMeters } from "@/lib/geo";

export interface GpsFix {
  /** Device timestamp at capture, ISO — never the time it was sent. */
  at: string;
  lat: number;
  lng: number;
  /** km/h. `navigator.geolocation` reports m/s and is `null` indoors on most
   * devices — converted and left absent, never reported as a stationary 0. */
  speedKmh?: number;
  heading?: number;
  /** Radius of uncertainty in metres, as the device reports it. */
  accuracy?: number;
}

export type GpsStreamStopReason =
  | "manual"
  | "permission-denied"
  | "server-refused";

type GeolocationLike = Pick<Geolocation, "watchPosition" | "clearWatch">;

export interface GpsStreamHandle {
  geolocation: GeolocationLike;
  /** Sends one batch. Rejecting keeps the fixes and retries with backoff,
   * unless `isFatal` says the failure will never resolve on retry. */
  send: (fixes: GpsFix[]) => Promise<void>;
  /** True when retrying is pointless — the run closed, or the agency
   * switched tracking off mid-session. The stream stops rather than
   * spending its backoff schedule on a request that can only fail again. */
  isFatal?: (err: unknown) => boolean;
  onStopped?: (reason: GpsStreamStopReason) => void;
}

/** A shade under 30s, so a slightly slow device clock does not halve the
 * effective rate by missing every other tick. */
const THROTTLE_MS = 25_000;
/** A fix is kept anyway once the device has moved this far, even inside the
 * throttle window — a truck accelerating away from a gate should be visible
 * on the very next flush, not thirty seconds later. */
const THROTTLE_MOVE_M = 100;
const FLUSH_COUNT = 6;
const FLUSH_MS = 120_000;
/** Matches the server's own per-batch limit — see IngestRequest.Fixes. */
const BUFFER_CAP = 60;
const RETRY_DELAYS_MS = [5_000, 15_000, 60_000];

export interface GpsStream {
  start(): void;
  stop(reason?: GpsStreamStopReason): void;
  readonly active: boolean;
}

export function createGpsStream(handle: GpsStreamHandle): GpsStream {
  let watchId: number | null = null;
  let flushTimer: ReturnType<typeof setInterval> | null = null;
  let buffer: GpsFix[] = [];
  let lastKept: GpsFix | null = null;
  let flushing = false;
  let retryAttempt = 0;

  function onPosition(pos: GeolocationPosition) {
    const fix: GpsFix = {
      at: new Date(pos.timestamp).toISOString(),
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      speedKmh: pos.coords.speed != null ? pos.coords.speed * 3.6 : undefined,
      heading: pos.coords.heading ?? undefined,
      accuracy: pos.coords.accuracy ?? undefined,
    };

    const elapsedMs = lastKept
      ? new Date(fix.at).getTime() - new Date(lastKept.at).getTime()
      : Infinity;
    const movedM = lastKept
      ? distanceMeters({ lat: lastKept.lat, lng: lastKept.lng }, { lat: fix.lat, lng: fix.lng })
      : Infinity;
    // Too soon and too close: the same position reported again, not a new
    // one worth a row.
    if (elapsedMs < THROTTLE_MS && movedM < THROTTLE_MOVE_M) return;

    lastKept = fix;
    buffer.push(fix);
    // Drop the oldest rather than grow without bound — a gap in the replay
    // costs less than an unbounded queue building up on a phone that has
    // been offline for hours.
    if (buffer.length > BUFFER_CAP) buffer.shift();
    if (buffer.length >= FLUSH_COUNT) void flush();
  }

  function onPositionError(err: GeolocationPositionError) {
    if (err.code === err.PERMISSION_DENIED) {
      // A driver who said no is not asked again this session.
      stop("permission-denied");
    }
    // Anything else (no fix yet, timed out) is transient: the next callback
    // from watchPosition tries again on its own.
  }

  async function flush() {
    if (flushing || buffer.length === 0) return;
    flushing = true;
    const batch = buffer;
    buffer = [];
    try {
      await handle.send(batch);
      retryAttempt = 0;
    } catch (err) {
      if (handle.isFatal?.(err)) {
        // The run this batch belonged to is gone, or the agency switched
        // tracking off mid-session — retrying spends the backoff schedule on
        // a request that can only fail the same way again.
        stop("server-refused");
        return;
      }
      // Put it back, oldest-first, and try again after a wait. A tunnel
      // costs latency, not data.
      buffer = [...batch, ...buffer].slice(-BUFFER_CAP);
      const delay = RETRY_DELAYS_MS[Math.min(retryAttempt, RETRY_DELAYS_MS.length - 1)];
      retryAttempt++;
      setTimeout(() => void flush(), delay);
    } finally {
      flushing = false;
    }
  }

  function onVisibilityChange() {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      // The most likely moment for the tab to be frozen next — send what is
      // held rather than let it sit until the next timer tick.
      void flush();
    }
  }

  function start() {
    if (watchId !== null) return;
    watchId = handle.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      // Unlike capturePosition's corroboration reads, a cached fix here is
      // not useful — the point is the current position, not a recent one.
      maximumAge: 0,
      timeout: 30_000,
    });
    flushTimer = setInterval(() => void flush(), FLUSH_MS);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisibilityChange);
    }
  }

  function stop(reason: GpsStreamStopReason = "manual") {
    if (watchId !== null) {
      handle.geolocation.clearWatch(watchId);
      watchId = null;
    }
    if (flushTimer !== null) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
    buffer = [];
    lastKept = null;
    retryAttempt = 0;
    handle.onStopped?.(reason);
  }

  return {
    start,
    stop,
    get active() {
      return watchId !== null;
    },
  };
}
