export type PlanStatus = "Draft" | "Terkonfirmasi" | "Selesai";

export interface DistributionPlan {
  id: string;
  tanggal: string;
  totalTabung: number;
  jumlahPangkalan: number;
  jumlahDriver: number;
  status: PlanStatus;
}

export interface PlanRow {
  id: string;
  pangkalan: string;
  alamat: string;
  jumlahTabung: number;
  driver: string;
  jamPengiriman: string;
  statusBayar: "Lunas" | "Belum Lunas";
}
