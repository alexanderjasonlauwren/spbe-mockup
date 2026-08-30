import { describe, expect, it } from "vitest";
import {
  ALASAN_KAPASITAS,
  ALASAN_TANPA_ARMADA,
  ALASAN_TERLALU_BESAR,
  suggestAssignment,
} from "./suggestAssignment";
import type { DriverOption, PlanRow } from "../types";

function row(over: Partial<PlanRow> & { outletId: string; jumlahUnit: number }): PlanRow {
  return {
    id: `row-${over.outletId}`,
    outlet: `Outlet ${over.outletId}`,
    alamat: "",
    lines: [{ productId: "p1", jumlah: over.jumlahUnit }],
    driverId: null,
    driver: "Belum ditetapkan",
    jamPengiriman: "08:00",
    statusBayar: "Lunas",
    sisaKuotaOutlet: 0,
    piutang: 0,
    piutangJatuhTempo: 0,
    tripNo: null,
    ...over,
  };
}

function driver(id: string, kapasitas: number, over: Partial<DriverOption> = {}): DriverOption {
  return {
    id,
    label: `Driver ${id}`,
    sublabel: `B ${id} XX`,
    kapasitas,
    muatan: 0,
    status: "Aktif",
    ...over,
  };
}

describe("suggestAssignment", () => {
  it("never puts more on a trip than the truck can carry", () => {
    const suggestion = suggestAssignment(
      [row({ outletId: "a", jumlahUnit: 60 }), row({ outletId: "b", jumlahUnit: 60 })],
      [driver("d1", 100)],
    );

    for (const trip of suggestion.trips) {
      expect(trip.muatan).toBeLessThanOrEqual(trip.kapasitas);
    }
  });

  it("gives every stop either a trip or a stated reason", () => {
    const rows = [
      row({ outletId: "a", jumlahUnit: 60 }),
      row({ outletId: "b", jumlahUnit: 60 }),
      row({ outletId: "c", jumlahUnit: 900 }),
    ];

    const suggestion = suggestAssignment(rows, [driver("d1", 100)]);

    const placed = suggestion.trips.flatMap((t) => t.stops.map((s) => s.outletId));
    const rejected = suggestion.unroutable.map((u) => u.outletId);
    expect([...placed, ...rejected].sort()).toEqual(["a", "b", "c"]);
    // No stop counted twice: a stop both placed and rejected would read as
    // handled on one screen and dropped on the other.
    expect(new Set([...placed, ...rejected]).size).toBe(3);
  });

  it("reloads the same driver rather than refusing work the fleet can carry", () => {
    // One truck of 100, three stops of 80. A one-trip-per-driver planner places
    // one and rejects two.
    const suggestion = suggestAssignment(
      [
        row({ outletId: "a", jumlahUnit: 80 }),
        row({ outletId: "b", jumlahUnit: 80 }),
        row({ outletId: "c", jumlahUnit: 80 }),
      ],
      [driver("d1", 100)],
    );

    expect(suggestion.unroutable).toHaveLength(0);
    expect(suggestion.trips.map((t) => t.tripNo)).toEqual([1, 2, 3]);
    expect(suggestion.trips.every((t) => t.driverId === "d1")).toBe(true);
  });

  it("spreads across the fleet before sending one driver out twice", () => {
    const suggestion = suggestAssignment(
      [row({ outletId: "a", jumlahUnit: 80 }), row({ outletId: "b", jumlahUnit: 80 })],
      [driver("d1", 100), driver("d2", 100)],
    );

    expect(new Set(suggestion.trips.map((t) => t.driverId)).size).toBe(2);
    expect(suggestion.trips.every((t) => t.tripNo === 1)).toBe(true);
  });

  it("produces the same board when the input is reordered", () => {
    // Every stop the same size at the same hour, so weight and time separate
    // nothing and only the outlet tie-break makes the order total. Distinct
    // weights would let this pass against a comparator with no tie-break at
    // all, which is exactly the bug it exists to catch.
    const rows = ["a", "b", "c", "d"].map((id) =>
      row({ outletId: id, jumlahUnit: 50 }),
    );
    const drivers = [driver("d1", 100), driver("d2", 100)];

    const forward = suggestAssignment(rows, drivers);
    const reversed = suggestAssignment(rows.slice().reverse(), drivers);

    expect(reversed).toEqual(forward);
  });

  it("ties break the same way for two identical trucks", () => {
    // Equal capacity is the case a sort with no final tie-break gets wrong:
    // the comparator returns 0 and the engine is free to swap them.
    const rows = [row({ outletId: "a", jumlahUnit: 50 })];
    const first = suggestAssignment(rows, [driver("d1", 100), driver("d2", 100)]);
    const second = suggestAssignment(rows, [driver("d2", 100), driver("d1", 100)]);

    expect(second.trips[0]?.driverId).toBe(first.trips[0]?.driverId);
  });

  it("carries an unpaid stop and counts it as at risk", () => {
    const suggestion = suggestAssignment(
      [
        row({ outletId: "a", jumlahUnit: 30 }),
        row({ outletId: "b", jumlahUnit: 20, statusBayar: "Belum Lunas" }),
      ],
      [driver("d1", 100)],
    );

    const stops = suggestion.trips.flatMap((t) => t.stops);
    expect(stops.map((s) => s.outletId).sort()).toEqual(["a", "b"]);
    expect(stops.find((s) => s.outletId === "b")?.lunas).toBe(false);
    expect(suggestion.trips[0]?.muatanBerisiko).toBe(20);
  });

  it("numbers stops from one within each trip", () => {
    const suggestion = suggestAssignment(
      [
        row({ outletId: "a", jumlahUnit: 30 }),
        row({ outletId: "b", jumlahUnit: 30 }),
        row({ outletId: "c", jumlahUnit: 30 }),
      ],
      [driver("d1", 60), driver("d2", 60)],
    );

    for (const trip of suggestion.trips) {
      expect(trip.stops.map((s) => s.urutan)).toEqual(
        trip.stops.map((_, i) => i + 1),
      );
    }
  });

  it("distinguishes a stop too big for any truck from one that merely did not fit", () => {
    const suggestion = suggestAssignment(
      [row({ outletId: "big", jumlahUnit: 500 })],
      [driver("d1", 100)],
    );

    expect(suggestion.unroutable[0]?.alasan).toBe(ALASAN_TERLALU_BESAR);
  });

  it("says there is no fleet rather than blaming capacity", () => {
    const suggestion = suggestAssignment([row({ outletId: "a", jumlahUnit: 10 })], []);

    expect(suggestion.trips).toHaveLength(0);
    expect(suggestion.unroutable[0]?.alasan).toBe(ALASAN_TANPA_ARMADA);
  });

  it("reports capacity exhausted once every driver has run their trips", () => {
    // One truck of 100 and four stops of 80: three trips absorb three, and the
    // fourth has nowhere left to go.
    const suggestion = suggestAssignment(
      ["a", "b", "c", "d"].map((id) => row({ outletId: id, jumlahUnit: 80 })),
      [driver("d1", 100)],
    );

    expect(suggestion.trips).toHaveLength(3);
    expect(suggestion.unroutable).toHaveLength(1);
    expect(suggestion.unroutable[0]?.alasan).toBe(ALASAN_KAPASITAS);
  });

  it("leaves a driver on leave at the pool", () => {
    const suggestion = suggestAssignment(
      [row({ outletId: "a", jumlahUnit: 10 })],
      [driver("cuti", 500, { disabled: true }), driver("d1", 100)],
    );

    expect(suggestion.trips[0]?.driverId).toBe("d1");
  });

  it("states what the proposal is based on", () => {
    const suggestion = suggestAssignment([], [driver("d1", 100)]);
    // The panel prints this. An empty string would let the UI imply the board
    // accounts for driving distance, which it does not.
    expect(suggestion.dasar).toMatch(/jarak/i);
  });
});
