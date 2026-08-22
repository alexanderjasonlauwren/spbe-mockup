import type { MonitoringRow } from "../types";

export type StopState = "done" | "next" | "pending";

export interface RoundStop {
  outletId: string;
  /** 1-based position in the round. Only meaningful when `numbered` is true. */
  order: number;
  state: StopState;
  row: MonitoringRow;
}

export interface RoundSequence {
  /** Stops in planned order. */
  stops: RoundStop[];
  byOutlet: Map<string, RoundStop>;
  /**
   * True when the window holds exactly one visit per outlet — i.e. one round.
   * Widen the board to seven days and a driver accumulates repeat visits, at
   * which point the ordinals stop describing anything a truck actually drives.
   */
  isSingleRound: boolean;
  /** Whether stop numbers should be shown at all. */
  numbered: boolean;
  doneCount: number;
}

const EMPTY: RoundSequence = {
  stops: [],
  byOutlet: new Map(),
  isSingleRound: false,
  numbered: false,
  doneCount: 0,
};

/**
 * The focused driver's round, as an ordered sequence of outlets.
 *
 * Built from the surat jalan rather than from the assignment: assignment.stops
 * is bare coordinates with no identity, and the sequence has to span the stops
 * already served as well as the ones still to come.
 *
 * Shared by the map and the stop list so the two can never disagree about what
 * order the round is in or which stop is next.
 */
export function buildRoundSequence(
  rows: MonitoringRow[],
  driverId: string | null,
  nextOutletId: string | undefined,
): RoundSequence {
  if (!driverId) return EMPTY;

  const mine = rows
    .filter((r) => r.driverId === driverId)
    .sort((a, b) => a.jamRencana.localeCompare(b.jamRencana));

  if (mine.length === 0) return EMPTY;

  const stops: RoundStop[] = mine.map((row, i) => ({
    outletId: row.outletId,
    order: i + 1,
    state:
      row.status === "Selesai"
        ? "done"
        : row.outletId === nextOutletId
          ? "next"
          : "pending",
    row,
  }));

  // Keyed by outlet, so a repeat visit overwrites: the newest state for an
  // outlet is the one worth putting on a map pin.
  const byOutlet = new Map(stops.map((s) => [s.outletId, s]));

  // One round visits an outlet once. Fewer keys than stops means the window is
  // several rounds stacked together, and the ordinals collide on whichever
  // visit was written last.
  const isSingleRound = byOutlet.size === stops.length;

  return {
    stops,
    byOutlet,
    isSingleRound,
    numbered: isSingleRound && stops.length <= 12,
    doneCount: stops.filter((s) => s.state === "done").length,
  };
}
