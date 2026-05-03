export interface KpiSummary {
  dailyDistributed: number;
  dailyTarget: number;
  monthlyQuotaRemaining: number;
  monthlyQuotaTotal: number;
  activePangkalan: number;
  totalPangkalan: number;
  pendingPayments: number;
}

export interface MonthlyChartPoint {
  week: string;
  target: number;
  realisasi: number;
}

export interface PangkalanShare {
  name: string;
  value: number;
  percentage: number;
}

export type ActivityStatus =
  | "Selesai"
  | "Dalam Pengiriman"
  | "Loading"
  | "Pending";

export interface RecentActivity {
  id: string;
  tanggal: string;
  pangkalan: string;
  driver: string;
  jumlahTabung: number;
  status: ActivityStatus;
}
