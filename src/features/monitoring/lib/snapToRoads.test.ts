import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { snapToRoads, type Coord } from "./snapToRoads";

const jakarta: Coord = [-6.2, 106.8];
const bandung: Coord = [-6.9, 107.6];

describe("snapToRoads", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_ROUTER_URL", "https://router.example.internal");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns the waypoints unchanged with fewer than two points", async () => {
    const result = await snapToRoads([jakarta]);
    expect(result).toEqual([jakarta]);
  });

  it("returns straight legs when no router is configured", async () => {
    vi.stubEnv("VITE_ROUTER_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await snapToRoads([jakarta, bandung]);

    expect(result).toEqual([jakarta, bandung]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swaps the router's [lng, lat] geometry back to [lat, lng]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          routes: [
            {
              geometry: {
                coordinates: [
                  [106.8, -6.2],
                  [107.2, -6.5],
                  [107.6, -6.9],
                ],
              },
            },
          ],
        }),
      }),
    );

    const result = await snapToRoads([jakarta, bandung]);

    expect(result).toEqual([
      [-6.2, 106.8],
      [-6.5, 107.2],
      [-6.9, 107.6],
    ]);
  });

  it("falls back to the straight line when the router responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const result = await snapToRoads([jakarta, bandung]);

    expect(result).toEqual([jakarta, bandung]);
  });

  it("falls back to the straight line when the router is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await snapToRoads([jakarta, bandung]);

    expect(result).toEqual([jakarta, bandung]);
  });

  it("falls back to the straight line when the response carries no route geometry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ routes: [] }) }),
    );

    const result = await snapToRoads([jakarta, bandung]);

    expect(result).toEqual([jakarta, bandung]);
  });
});
