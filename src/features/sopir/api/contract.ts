/**
 * What every driver-screen adapter must provide.
 *
 * Same reason as `features/sa/api/contract.ts`: without a contract the mock and
 * the HTTP adapter drift, and the drift shows up only on whichever screen reads
 * the field one of them forgot. Here that screen is a phone at a pangkalan
 * gate, which is the worst place to find out.
 */
import type { DriverOption, DriverRun } from "../types";

/**
 * What a filing hands back to the screen.
 *
 * `kode` is every surat jalan the stop covers, because a stop with two
 * cylinder sizes has two documents and the driver hands over both. `realisasi`
 * is the count that ends up on the outlet's bill.
 */
export interface StopReceipt {
  kode: string;
  realisasi: number;
}

export interface CompleteStopInput {
  deliveryId: string;
  /** Per product — the sopir unloaded it, so they know the breakdown. */
  lines: { productId: string; realisasi: number; kembali?: number }[];
  diterimaOleh: string;
  catatan?: string;
}

export interface SopirApi {
  /**
   * One driver's run for a day.
   *
   * `driverId` is what the *mock* narrows by, and what the demo's driver picker
   * supplies. Against the service it is ignored: the run comes from
   * `GET /deliveries/mine`, which resolves the driver from the session. Two
   * drivers in one branch are the same tenant, so no policy separates them —
   * an id in flight would be an id a caller could change.
   */
  getMyRun(driverId: string, tanggal?: string): Promise<DriverRun>;

  departStop(deliveryId: string): Promise<StopReceipt>;
  completeStop(input: CompleteStopInput): Promise<StopReceipt>;
  /** Could not deliver. Leaves the stop open and raises no invoice. */
  holdStop(input: { deliveryId: string; catatan: string }): Promise<StopReceipt>;

  /**
   * Fleet list for accounts that are not themselves a sopir — a dispatcher
   * covering the radio, or an admin checking what the driver sees.
   */
  getDriverOptions(): Promise<DriverOption[]>;
}
