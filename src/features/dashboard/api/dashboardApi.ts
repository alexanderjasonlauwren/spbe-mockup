import { MOCK_DELAY_MS } from "@/utils/constants";
import type {
  KpiSummary,
  MonthlyChartPoint,
  PangkalanShare,
  RecentActivity,
} from "../types";

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

export async function getKpiSummary(): Promise<KpiSummary> {
  await delay();
  return {
    dailyDistributed: 1284,
    dailyTarget: 1400,
    monthlyQuotaRemaining: 45200,
    monthlyQuotaTotal: 70000,
    activePangkalan: 142,
    totalPangkalan: 150,
    pendingPayments: 24,
  };
}

export async function getMonthlyChart(): Promise<MonthlyChartPoint[]> {
  await delay();
  return [
    { week: "Ming 1", target: 14000, realisasi: 11200 },
    { week: "Ming 2", target: 14000, realisasi: 13500 },
    { week: "Ming 3", target: 14000, realisasi: 15800 },
    { week: "Ming 4", target: 14000, realisasi: 12900 },
    { week: "Ming 5", target: 14000, realisasi: 10800 },
  ];
}

export async function getPangkalanShares(): Promise<PangkalanShare[]> {
  await delay();
  return [
    { name: "Jakarta Selatan", value: 840, percentage: 70 },
    { name: "Jakarta Pusat", value: 300, percentage: 25 },
    { name: "Lainnya", value: 60, percentage: 5 },
  ];
}

export async function getRecentActivities(): Promise<RecentActivity[]> {
  await delay();
  return [
    {
      id: "act-001",
      tanggal: "1 Mei 2026, 08:30",
      pangkalan: "Pangkalan Berkah Jaya",
      driver: "Agus Setiawan",
      jumlahTabung: 250,
      status: "Selesai",
    },
    {
      id: "act-002",
      tanggal: "1 Mei 2026, 09:15",
      pangkalan: "UD Maju Terus",
      driver: "Bambang Wijaya",
      jumlahTabung: 180,
      status: "Dalam Pengiriman",
    },
    {
      id: "act-003",
      tanggal: "1 Mei 2026, 10:05",
      pangkalan: "Toko Gas Sejahtera",
      driver: "Rahmat Hidayat",
      jumlahTabung: 320,
      status: "Loading",
    },
    {
      id: "act-004",
      tanggal: "1 Mei 2026, 11:20",
      pangkalan: "Pangkalan Ibu Ani",
      driver: "Dedi Kurniawan",
      jumlahTabung: 150,
      status: "Pending",
    },
    {
      id: "act-005",
      tanggal: "1 Mei 2026, 13:45",
      pangkalan: "Sumber Gas Rejeki",
      driver: "Surya Saputra",
      jumlahTabung: 200,
      status: "Selesai",
    },
  ];
}
