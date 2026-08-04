export interface KpiSummary {
  dailyDistributed: number;
  dailyTarget: number;
  monthlyQuotaRemaining: number;
  monthlyQuotaTotal: number;
  activePangkalan: number;
  totalPangkalan: number;
  pendingPayments: number;
  pendingPaymentValue: number;
  /** Yesterday's realised tonnage, for the day-on-day comparison. */
  previousDayDistributed: number;
  openOrders: number;
  lateDeliveries: number;
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

/* ── dispatch rail ──────────────────────────────────────────────────────── */

export type StopStage = "Antrian" | "Proses" | "Selesai" | "Tertunda";

/** One drop on a truck's day, positioned by its planned time. */
export interface DispatchStop {
  id: string;
  kode: string;
  pangkalan: string;
  kecamatan: string;
  /** Minutes from midnight — the rail positions stops on this. */
  startMinute: number;
  endMinute: number;
  target: number;
  realisasi: number;
  stage: StopStage;
}

/** One truck's lane across the working day. */
export interface DispatchLane {
  driverId: string;
  driver: string;
  plat: string;
  armada: string;
  kapasitas: number;
  muatan: number;
  status: string;
  stops: DispatchStop[];
}

export interface DispatchRail {
  /** Working-day bounds in minutes from midnight. */
  dayStart: number;
  dayEnd: number;
  nowMinute: number;
  lanes: DispatchLane[];
  /** Trucks with nothing assigned today. */
  idleDrivers: { id: string; nama: string; plat: string; status: string }[];
}
