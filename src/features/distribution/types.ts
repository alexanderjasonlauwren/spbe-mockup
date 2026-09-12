export type PlanStatus = "Draft" | "Terkonfirmasi" | "Selesai" | "Batal";

export interface DistributionPlan {
  id: string;
  kode: string;
  /** ISO date. */
  tanggal: string;
  totalUnit: number;
  jumlahOutlet: number;
  jumlahDriver: number;
  status: PlanStatus;
  saId: string;
  nomorSA: string;
  /** Quota left on the backing agreement, so the planner can see the ceiling. */
  sisaKuotaSA: number;
  catatan?: string;
  dibuatOleh: string;
  dikonfirmasiOleh?: string;
  dikonfirmasiPada?: string;
  /**
   * The optimistic-locking counter the caller must echo back to save, confirm
   * or cancel.
   *
   * Without it there is nothing to detect a concurrent edit against, and the
   * service refuses a write built on a stale value with 409 rather than
   * overwriting whatever the other planner committed. The mock build has one
   * writer and carries a constant.
   */
  version: number;
}

export interface PlanRow {
  id: string;
  outletId: string;
  outlet: string;
  alamat: string;
  /** What this stop is carrying, per product. */
  lines: { productId: string; jumlah: number }[];
  /** Derived from `lines`. */
  jumlahUnit: number;
  driverId: string | null;
  driver: string;
  /**
   * The truck for this stop's run. Null until one is chosen.
   *
   * Capacity lives here rather than on the driver: a driver has no capacity of
   * their own, and which truck they take is a fact about today. The service
   * requires it — `dispatch_trips.vehicle_id` is NOT NULL — so a board without
   * it cannot be applied.
   */
  vehicleId: string | null;
  vehicle: string;
  jamPengiriman: string;
  statusBayar: "Lunas" | "Belum Lunas";
  /** Cylinders this outlet may still take this month. */
  sisaKuotaOutlet: number;
  /** Outstanding receivable, so credit risk is visible while planning. */
  piutang: number;
  piutangJatuhTempo: number;
  /** The depot cycle this stop belongs to. Null until it is assigned. */
  tripNo: number | null;
  /** Set when this stop would be refused on confirmation. */
  alasanBlokir?: string;
  /**
   * The run this stop's trip actually posts against once assigned — an
   * opaque id, not a display value. On the API build this is the real
   * `dispatch_trips.id` a saved board carries; the mock has no trips table
   * at all, so it synthesises the same `driverId#tripNo` key the planner
   * already groups rows by. Null until a driver and trip number are both
   * set, since neither build can name a run before then.
   */
  tripId?: string | null;
  /**
   * The trip's own status, when known (`"planned"`, `"dispatched"`, …).
   * Absent on the mock build, which does not persist per-trip dispatch
   * state — see `dispatchTrip`'s own header comment.
   */
  tripStatus?: string;
}

export interface PlanOption {
  id: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

/** A truck the dispatcher can put a run on. */
export interface VehicleOption extends PlanOption {
  /** Units one load holds. The ceiling a trip is judged against. */
  kapasitas: number;
}

export interface DriverOption extends PlanOption {
  kapasitas: number;
  /** Cylinders already loaded onto this truck in the open plan. */
  muatan: number;
  status: string;
}

/**
 * A trip is one depot cycle: load at the pool, visit several outlets, return.
 *
 * It is the unit capacity applies to, which is why the panel groups by it
 * rather than by driver -- a driver who reloads at midday does two trips, and
 * summing both against one truckload reports an overload that is not real.
 *
 * Null on a row that has not been assigned yet. `driverId` without `tripNo` is
 * the shape the console had before trips existed, and it still loads: such a
 * row is shown as trip 1 for that driver.
 */
export type TripNo = number;

export interface SuggestedStop {
  outletId: string;
  outlet: string;
  jumlahUnit: number;
  /** Position within the trip, 1-based. */
  urutan: number;
  /** False when no payment has arrived for this stop. Flagged, never hidden. */
  lunas: boolean;
}

export interface SuggestedTrip {
  tripNo: TripNo;
  driverId: string;
  driver: string;
  /** The truck the proposal put this run on, where the source knows one. */
  vehicleId?: string;
  /** Plate and vehicle, as the driver options carry them. */
  armada: string;
  kapasitas: number;
  muatan: number;
  /** Cylinders on this trip with no payment behind them yet. */
  muatanBerisiko: number;
  stops: SuggestedStop[];
}

/** A stop the planner could not place, and why. Never a silent drop. */
export interface UnroutableStop {
  outletId: string;
  outlet: string;
  jumlahUnit: number;
  alasan: string;
}

export interface AssignmentSuggestion {
  trips: SuggestedTrip[];
  unroutable: UnroutableStop[];
  /**
   * What the proposal is based on, in the planner's own words.
   *
   * The mock has no outlet coordinates, so it can propose which stops share a
   * truck and never what order to drive them in. The service can do both. The
   * panel prints this rather than asserting a quality neither adapter promised.
   */
  dasar: string;
}
