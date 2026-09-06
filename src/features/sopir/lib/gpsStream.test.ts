import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGpsStream, type GpsFix } from "./gpsStream";

/**
 * The throttle, the batching and the retry policy are the whole reason this
 * module is separate from the hook that starts it — getting any of them
 * wrong does not throw, it just quietly drains a phone's battery or loses a
 * truck's trail. Driven entirely by a fake clock and a fake geolocation
 * object, so none of this depends on a browser actually having a position.
 */

// A minimal watchPosition/clearWatch pair the tests drive by hand: calling
// `emit(pos)` or `emitError(err)` invokes whatever callback `start()` last
// registered, exactly like a real GPS chip reporting in.
function fakeGeolocation() {
  let onSuccess: ((pos: GeolocationPosition) => void) | null = null;
  let onError: ((err: GeolocationPositionError) => void) | null = null;
  let nextId = 1;
  const cleared: number[] = [];

  return {
    geolocation: {
      watchPosition: vi.fn(
        (success: (pos: GeolocationPosition) => void, error?: (err: GeolocationPositionError) => void) => {
          onSuccess = success;
          onError = error ?? null;
          return nextId++;
        },
      ),
      clearWatch: vi.fn((id: number) => {
        cleared.push(id);
      }),
    },
    cleared,
    emit(overrides: Partial<GeolocationCoordinates> & { timestamp?: number } = {}) {
      onSuccess?.({
        timestamp: overrides.timestamp ?? Date.now(),
        coords: {
          latitude: overrides.latitude ?? -6.9932,
          longitude: overrides.longitude ?? 110.3453,
          accuracy: overrides.accuracy ?? 10,
          speed: overrides.speed ?? null,
          heading: overrides.heading ?? null,
          altitude: null,
          altitudeAccuracy: null,
        },
      } as GeolocationPosition);
    },
    emitError(code: number) {
      onError?.({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" } as GeolocationPositionError);
    },
  };
}

let geo: ReturnType<typeof fakeGeolocation>;
let send: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  geo = fakeGeolocation();
  send = vi.fn().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("throttling", () => {
  it("keeps roughly one fix every thirty seconds and discards the rest", async () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();

    const t0 = Date.now();
    // Six fixes 26s apart -- each one kept -- with two near-duplicates a few
    // seconds after every kept one, which must be discarded by the throttle.
    // 18 emitted, 6 kept: if the throttle were not working every one of the
    // 18 would be kept and the flush at the sixth push would fire early.
    for (let i = 0; i < 6; i++) {
      const base = t0 + i * 26_000;
      geo.emit({ timestamp: base });
      geo.emit({ timestamp: base + 5_000 });
      geo.emit({ timestamp: base + 10_000 });
    }
    await vi.advanceTimersByTimeAsync(0);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toHaveLength(6);

    // The discriminating check: with the throttle actually discarding the
    // twelve near-duplicates, nothing is left in the buffer, so the periodic
    // timer finds nothing to send. A throttle that kept everything would
    // leave twelve fixes behind for this tick to flush -- and the assertions
    // above alone cannot tell the two cases apart, since the first flush
    // takes the first six pushed either way.
    await vi.advanceTimersByTimeAsync(120_000);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("keeps a fix that moved a hundred metres even inside the throttle window", async () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();

    const t0 = Date.now();
    for (let i = 0; i < 5; i++) {
      geo.emit({ timestamp: t0 + i * 26_000, latitude: -6.9932, longitude: 110.3453 });
    }
    // A sixth fix, one second later, but a kilometre away -- kept despite
    // being inside the throttle window, which is exactly what a truck
    // accelerating away from a gate needs.
    geo.emit({ timestamp: t0 + 5 * 26_000 + 1_000, latitude: -6.985, longitude: 110.3453 });

    await vi.runOnlyPendingTimersAsync();
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toHaveLength(6);
  });
});

describe("batching", () => {
  it("flushes on the sixth kept fix without waiting for the timer", async () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();

    const t0 = Date.now();
    for (let i = 0; i < 6; i++) {
      geo.emit({ timestamp: t0 + i * 26_000 });
    }
    await vi.runOnlyPendingTimersAsync();

    expect(send).toHaveBeenCalledTimes(1);
    const batch = send.mock.calls[0][0] as GpsFix[];
    expect(batch).toHaveLength(6);
  });

  it("flushes on its own timer even with fewer than six fixes held", async () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();
    geo.emit();

    await vi.advanceTimersByTimeAsync(120_000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toHaveLength(1);
  });

  it("drops the oldest fix rather than growing past the server's batch limit", async () => {
    let releaseFirst!: () => void;
    const firstCall = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const sendMock = vi.fn().mockImplementationOnce(() => firstCall).mockResolvedValue(undefined);
    const stream = createGpsStream({ geolocation: geo.geolocation, send: sendMock });
    stream.start();

    const t0 = Date.now();
    // The 6th kept fix triggers a flush that blocks on firstCall; the other
    // 64 pile into the buffer behind it while nothing is draining it, which
    // is exactly the condition the cap exists for -- an offline phone whose
    // first flush attempt is hung.
    for (let i = 0; i < 70; i++) {
      geo.emit({ timestamp: t0 + i * 26_000 });
    }
    await vi.advanceTimersByTimeAsync(0);
    expect(sendMock).toHaveBeenCalledTimes(1);

    releaseFirst();
    await vi.advanceTimersByTimeAsync(0);
    // Nothing re-flushes on its own once the stuck send clears -- only the
    // periodic timer or a fresh kept fix does. Advance to the timer.
    await vi.advanceTimersByTimeAsync(120_000);

    expect(sendMock).toHaveBeenCalledTimes(2);
    // 64 arrived while the first flush was stuck; capped at 60, so the
    // second flush holds 60, not 64 -- the oldest 4 of the pile were
    // dropped, not the batch growing past what the server accepts.
    expect(sendMock.mock.calls[1][0]).toHaveLength(60);
  });
});

describe("stopping", () => {
  it("stops watching for good when the driver refuses permission", () => {
    const onStopped = vi.fn();
    const stream = createGpsStream({ geolocation: geo.geolocation, send, onStopped });
    stream.start();

    geo.emitError(1 /* PERMISSION_DENIED */);

    expect(stream.active).toBe(false);
    expect(onStopped).toHaveBeenCalledWith("permission-denied");
    expect(geo.geolocation.clearWatch).toHaveBeenCalled();
  });

  it("stops rather than retrying when the server says the failure is fatal", async () => {
    const fatalErr = new Error("no open trip");
    const failingSend = vi.fn().mockRejectedValue(fatalErr);
    const onStopped = vi.fn();
    const stream = createGpsStream({
      geolocation: geo.geolocation,
      send: failingSend,
      isFatal: (err) => err === fatalErr,
      onStopped,
    });
    stream.start();

    for (let i = 0; i < 6; i++) geo.emit({ timestamp: Date.now() + i * 26_000 });
    await vi.runOnlyPendingTimersAsync();

    expect(onStopped).toHaveBeenCalledWith("server-refused");
    expect(stream.active).toBe(false);
    // No retry was scheduled -- advancing time further sends nothing more.
    failingSend.mockClear();
    await vi.advanceTimersByTimeAsync(120_000);
    expect(failingSend).not.toHaveBeenCalled();
  });

  it("retries a non-fatal failure with backoff, keeping the batch", async () => {
    const failOnce = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue(undefined);
    const stream = createGpsStream({ geolocation: geo.geolocation, send: failOnce });
    stream.start();

    for (let i = 0; i < 6; i++) geo.emit({ timestamp: Date.now() + i * 26_000 });
    // Zero, not runOnlyPendingTimersAsync: that would also advance far enough
    // to fire the 5s retry this same flush schedules, collapsing the two
    // attempts this test means to tell apart.
    await vi.advanceTimersByTimeAsync(0);
    expect(failOnce).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(failOnce).toHaveBeenCalledTimes(2);
    // The retried batch carried the same six fixes, not an empty one.
    expect(failOnce.mock.calls[1][0]).toHaveLength(6);
  });

  it("clears the watch on manual stop", () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();
    stream.stop();
    expect(geo.geolocation.clearWatch).toHaveBeenCalledTimes(1);
    expect(stream.active).toBe(false);
  });

  it("does nothing if stopped before it was ever started", () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.stop();
    expect(geo.geolocation.clearWatch).not.toHaveBeenCalled();
  });
});

describe("what a fix carries", () => {
  it("converts speed from metres per second to kilometres per hour", async () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();
    for (let i = 0; i < 6; i++) {
      geo.emit({ timestamp: Date.now() + i * 26_000, speed: 10 });
    }
    await vi.runOnlyPendingTimersAsync();
    const batch = send.mock.calls[0][0] as GpsFix[];
    expect(batch[0].speedKmh).toBeCloseTo(36, 5);
  });

  it("leaves speed absent rather than reporting a stationary truck", async () => {
    const stream = createGpsStream({ geolocation: geo.geolocation, send });
    stream.start();
    for (let i = 0; i < 6; i++) {
      geo.emit({ timestamp: Date.now() + i * 26_000, speed: null as unknown as number });
    }
    await vi.runOnlyPendingTimersAsync();
    const batch = send.mock.calls[0][0] as GpsFix[];
    expect(batch[0].speedKmh).toBeUndefined();
  });
});
