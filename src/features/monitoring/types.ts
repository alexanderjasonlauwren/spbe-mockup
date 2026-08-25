import type { GeoVerdict } from "@/lib/geo";

export type DriverStatus =
  | "Dalam Perjalanan"
  | "Bongkar Muat"
  | "Standby"
  | "Selesai"
  | "Cuti";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DriverCard {
  id: string;
  name: string;
  /**
   * Index into the fleet palette. Derived from the truck's position in the full
   * roster, so filtering the board never repaints the remaining routes.
   */
  slot: number;
  plat: string;
  armada: string;
  kapasitas: number;
  status: DriverStatus;
  /** Cylinders loaded for the selected window. */
  muatan: number;
  tujuanOutlet?: string;
  eta?: string;
  lokasi?: string;
  durasi?: string;
  /** Surat jalan on this truck: how many done out of how many issued. */
  selesai: number;
  total: number;
}

/** How well the sopir's filing corroborated being at the outlet. */
export interface FilingLocation {
  verdict: GeoVerdict;
  jarakMeter?: number;
}

/** One surat jalan on the monitoring board. */
export interface MonitoringRow {
  id: string;
  kode: string;
  outletId: string;
  outlet: string;
  alamat: string;
  driverId: string;
  driver: string;
  jamRencana: string;
  target: number;
  realisasi: number;
  pencapaianPersen: number;
  status: "Selesai" | "Proses" | "Antrian" | "Tertunda";
  coord: GeoPoint;
  /** From the most recent filing, when the driver's device supplied one. */
  lokasi?: FilingLocation;
  catatan?: string;
}

/**
 * One truck's run for the selected window: where it is now, and the stops it
 * still has to make. The map draws a route through these, so a standby truck
 * still shows the round it is about to drive.
 */
export interface MonitoringAssignment {
  id: string;
  driverId: string;
  /** Next stop — the one the truck is heading for. */
  outletId: string;
  driverCoord: GeoPoint;
  /** Remaining stops in delivery order, starting with the next one. */
  stops: GeoPoint[];
  /** True once the truck has left the yard. */
  berjalan: boolean;
  selesai: boolean;
}

export interface MonitoringSnapshot {
  drivers: DriverCard[];
  rows: MonitoringRow[];
  assignments: MonitoringAssignment[];
  lastSyncAt: string;
  totals: {
    target: number;
    realisasi: number;
    selesai: number;
    proses: number;
    antrian: number;
    tertunda: number;
  };
}
