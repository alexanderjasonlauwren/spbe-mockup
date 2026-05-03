export type DriverStatus =
  | "Dalam Perjalanan"
  | "Bongkar Muat"
  | "Standby"
  | "Selesai";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DriverCard {
  id: string;
  name: string;
  plat: string;
  armada: string;
  kapasitas: number;
  status: DriverStatus;
  tujuanPangkalan?: string;
  eta?: string;
  lokasi?: string;
  durasi?: string;
}

export interface MonitoringRow {
  id: string;
  pangkalan: string;
  alamat: string;
  target: number;
  realisasi: number;
  pencapaianPersen: number;
  status: "Selesai" | "Proses" | "Antrian" | "Tertunda";
  coord: GeoPoint;
}

export interface MonitoringAssignment {
  id: string;
  driverId: string;
  pangkalanId: string;
  driverCoord: GeoPoint;
}

export interface MonitoringSnapshot {
  drivers: DriverCard[];
  rows: MonitoringRow[];
  assignments: MonitoringAssignment[];
  lastSyncAt: string;
}
