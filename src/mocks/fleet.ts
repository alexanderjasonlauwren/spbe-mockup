import type { Database, DriverEntity, ID, VehicleEntity } from "@/types/domain";

/**
 * Which truck a driver is out in.
 *
 * # Why this is a function and not a column
 *
 * `core.drivers` and `core.vehicles` have no link between them, anywhere. The
 * pairing lives on `core.dispatch_trips` — a driver swaps trucks and a truck
 * swaps drivers, so a `default_vehicle_id` would be a second source of truth
 * for something a trip already records. The console's model used to collapse
 * the two by putting the plate on the driver, and this is what replaces it.
 *
 * # Why it is stable rather than real
 *
 * The mock store has no trips table: a plan row records a driver and nothing
 * about a vehicle, so there is no crewing decision here to read. Rather than
 * add one — which would be inventing the half of the dispatch model the demo
 * does not have — this pairs a driver with a truck by position in the branch's
 * fleet, deterministically.
 *
 * That keeps the demo looking exactly as it did while the model underneath is
 * the schema's. It is also the one thing in this file that is NOT true of the
 * service: there, the answer comes from the trip, and a driver with no trip has
 * no truck and no capacity. The HTTP adapter says so by reading the dispatch
 * board and leaving an uncrewed driver's capacity at zero.
 */
export function crewedVehicle(
  db: Pick<Database, "drivers" | "vehicles">,
  driverId: ID | null | undefined,
): VehicleEntity | undefined {
  if (!driverId) return undefined;

  const driver = db.drivers.find((d) => d.id === driverId);
  if (!driver) return undefined;

  // Scoped to the driver's own branch: a Salatiga driver in a Pati truck is not
  // a pairing the depot could make, and showing one would misreport capacity
  // for both branches.
  const fleet = db.vehicles.filter((v) => v.branchId === driver.branchId);
  if (fleet.length === 0) return undefined;

  const seat = db.drivers.filter((d) => d.branchId === driver.branchId).indexOf(driver);
  return fleet[seat % fleet.length];
}

/**
 * The capacity to judge a load against, or zero when no truck is known.
 *
 * Zero rather than a default, because a made-up ceiling is worse than none: a
 * planner told a load of 400 fits reads that as the truck fitting it.
 */
export function crewedCapacity(
  db: Pick<Database, "drivers" | "vehicles">,
  driverId: ID | null | undefined,
): number {
  return crewedVehicle(db, driverId)?.kapasitas ?? 0;
}

/** The plate and model, for a screen that shows a driver with their truck. */
export function crewedArmada(
  db: Pick<Database, "drivers" | "vehicles">,
  driver: DriverEntity,
): { plat: string; armada: string; kapasitas: number } {
  const vehicle = crewedVehicle(db, driver.id);
  return {
    plat: vehicle?.plat ?? "—",
    armada: vehicle?.armada ?? "Belum ada armada",
    kapasitas: vehicle?.kapasitas ?? 0,
  };
}
