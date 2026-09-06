// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The consent layer around the run tracker: off by default, remembered per
 * run, and turned back off — not silently retried — the moment the run or
 * the agency says recording cannot continue.
 */

const postGpsFixes = vi.fn();
vi.mock("../api/sopirApi", () => ({
  postGpsFixes: (...args: unknown[]) => postGpsFixes(...args),
}));

let watchPositionMock: ReturnType<typeof vi.fn>;
let clearWatchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  postGpsFixes.mockReset().mockResolvedValue(undefined);
  watchPositionMock = vi.fn(() => 1);
  clearWatchMock = vi.fn();
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { watchPosition: watchPositionMock, clearWatch: clearWatchMock },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const { useGpsStream } = await import("./useGpsStream");

describe("useGpsStream", () => {
  it("never starts when disabled, whatever localStorage remembers", () => {
    localStorage.setItem("sopir.trackRun.trip-1", "on");
    const { result } = renderHook(() => useGpsStream({ enabled: false, tripKey: "trip-1" }));
    expect(result.current.active).toBe(false);
    expect(watchPositionMock).not.toHaveBeenCalled();
  });

  it("is off by default for a run with no remembered preference", () => {
    const { result } = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    expect(result.current.wanted).toBe(false);
    expect(result.current.active).toBe(false);
    expect(watchPositionMock).not.toHaveBeenCalled();
  });

  it("starts watching once toggled on", () => {
    const { result } = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    act(() => result.current.toggle());

    expect(result.current.wanted).toBe(true);
    expect(result.current.active).toBe(true);
    expect(watchPositionMock).toHaveBeenCalledTimes(1);
  });

  it("stops watching when toggled back off", () => {
    const { result } = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    act(() => result.current.toggle());
    act(() => result.current.toggle());

    expect(result.current.active).toBe(false);
    expect(clearWatchMock).toHaveBeenCalledTimes(1);
  });

  it("remembers the choice across a remount of the same run", () => {
    const first = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    act(() => first.result.current.toggle());
    first.unmount();

    const second = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    expect(second.result.current.wanted).toBe(true);
    expect(second.result.current.active).toBe(true);
  });

  it("does not inherit an earlier run's choice for a new one", () => {
    const { result, rerender } = renderHook(
      ({ tripKey }) => useGpsStream({ enabled: true, tripKey }),
      { initialProps: { tripKey: "trip-1" } },
    );
    act(() => result.current.toggle());
    expect(result.current.wanted).toBe(true);

    rerender({ tripKey: "trip-2" });
    expect(result.current.wanted).toBe(false);
    expect(result.current.active).toBe(false);
  });

  it("clears the watch on unmount", () => {
    const { result, unmount } = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    act(() => result.current.toggle());
    unmount();
    expect(clearWatchMock).toHaveBeenCalledTimes(1);
  });

  it("turns itself back off and forgets the preference when the driver refuses permission", () => {
    const { result } = renderHook(() => useGpsStream({ enabled: true, tripKey: "trip-1" }));
    act(() => result.current.toggle());

    const onError = watchPositionMock.mock.calls[0][1] as (err: GeolocationPositionError) => void;
    act(() => {
      onError({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "" } as GeolocationPositionError);
    });

    expect(result.current.wanted).toBe(false);
    expect(result.current.active).toBe(false);
    expect(localStorage.getItem("sopir.trackRun.trip-1")).toBeNull();
  });

  it("toggle does nothing while disabled", () => {
    const { result } = renderHook(() => useGpsStream({ enabled: false, tripKey: "trip-1" }));
    act(() => result.current.toggle());
    expect(result.current.wanted).toBe(false);
    expect(watchPositionMock).not.toHaveBeenCalled();
  });
});
