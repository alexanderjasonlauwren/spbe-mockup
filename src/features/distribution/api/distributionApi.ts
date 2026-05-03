import { MOCK_DELAY_MS } from "@/utils/constants";
import type { DistributionPlan, PlanRow } from "../types";

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

const mockPlans: DistributionPlan[] = [
  {
    id: "plan-001",
    tanggal: "1 Mei 2026",
    totalTabung: 480,
    jumlahPangkalan: 5,
    jumlahDriver: 3,
    status: "Draft",
  },
  {
    id: "plan-002",
    tanggal: "30 Apr 2026",
    totalTabung: 620,
    jumlahPangkalan: 6,
    jumlahDriver: 4,
    status: "Terkonfirmasi",
  },
  {
    id: "plan-003",
    tanggal: "29 Apr 2026",
    totalTabung: 540,
    jumlahPangkalan: 5,
    jumlahDriver: 3,
    status: "Selesai",
  },
];

const mockRows: PlanRow[] = [
  {
    id: "row-001",
    pangkalan: "Pangkalan LPG Jaya Abadi",
    alamat: "Kec. Bekasi Selatan",
    jumlahTabung: 120,
    driver: "Budi Santoso",
    jamPengiriman: "08:00",
    statusBayar: "Lunas",
  },
  {
    id: "row-002",
    pangkalan: "Mitra Sejahtera Gas",
    alamat: "Kec. Rawasari",
    jumlahTabung: 100,
    driver: "Agus Setiawan",
    jamPengiriman: "09:30",
    statusBayar: "Belum Lunas",
  },
  {
    id: "row-003",
    pangkalan: "Toko Gas Utama Mandiri",
    alamat: "Kec. Cilincing Pusat",
    jumlahTabung: 80,
    driver: "Bambang Wijaya",
    jamPengiriman: "10:00",
    statusBayar: "Lunas",
  },
  {
    id: "row-004",
    pangkalan: "Pangkalan Berkah Rejeki",
    alamat: "Kec. Tambun Selatan",
    jumlahTabung: 100,
    driver: "Rahmat Hidayat",
    jamPengiriman: "11:00",
    statusBayar: "Belum Lunas",
  },
  {
    id: "row-005",
    pangkalan: "Pangkalan Sinar Baru",
    alamat: "Kec. Cikarang Pusat",
    jumlahTabung: 80,
    driver: "Budi Santoso",
    jamPengiriman: "13:00",
    statusBayar: "Lunas",
  },
];

export async function getPlanList(): Promise<DistributionPlan[]> {
  await delay();
  return mockPlans;
}

export async function getPlanDetail(_planId: string): Promise<PlanRow[]> {
  await delay();
  return mockRows;
}

export async function saveDraft(
  _planId: string,
  _rows: PlanRow[],
): Promise<void> {
  await delay();
}

export async function confirmPlan(_planId: string): Promise<void> {
  await delay();
}
