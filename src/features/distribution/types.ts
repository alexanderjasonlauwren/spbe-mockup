export type PlanStatus = "Draft" | "Terkonfirmasi" | "Selesai" | "Batal";

export interface DistributionPlan {
  id: string;
  kode: string;
  /** ISO date. */
  tanggal: string;
  totalTabung: number;
  jumlahPangkalan: number;
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
}

export interface PlanRow {
  id: string;
  pangkalanId: string;
  pangkalan: string;
  alamat: string;
  jumlahTabung: number;
  driverId: string | null;
  driver: string;
  jamPengiriman: string;
  statusBayar: "Lunas" | "Belum Lunas";
  /** Cylinders this pangkalan may still take this month. */
  sisaKuotaPangkalan: number;
  /** Outstanding receivable, so credit risk is visible while planning. */
  piutang: number;
  piutangJatuhTempo: number;
  /** Set when this stop would be refused on confirmation. */
  alasanBlokir?: string;
}

export interface PlanOption {
  id: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface DriverOption extends PlanOption {
  kapasitas: number;
  /** Cylinders already loaded onto this truck in the open plan. */
  muatan: number;
  status: string;
}
