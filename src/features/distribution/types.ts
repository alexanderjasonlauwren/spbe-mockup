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
  jamPengiriman: string;
  statusBayar: "Lunas" | "Belum Lunas";
  /** Cylinders this outlet may still take this month. */
  sisaKuotaOutlet: number;
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
