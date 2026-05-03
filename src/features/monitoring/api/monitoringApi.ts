import { MOCK_DELAY_MS } from "@/utils/constants";
import type {
  DriverCard,
  MonitoringAssignment,
  MonitoringRow,
  MonitoringSnapshot,
} from "../types";

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

const MOCK_DRIVERS: DriverCard[] = [
  {
    id: "d-001",
    name: "Budi Santoso",
    plat: "B 9231 TGH",
    armada: "Isuzu Giga",
    kapasitas: 560,
    status: "Dalam Perjalanan",
    eta: "14:30 WIB",
  },
  {
    id: "d-002",
    name: "Ahmad Subarjo",
    plat: "B 8842 AB",
    armada: "Hino Ranger",
    kapasitas: 420,
    status: "Bongkar Muat",
    durasi: "15 Menit",
  },
  {
    id: "d-003",
    name: "Rizky Ramadhan",
    plat: "F 1120 CK",
    armada: "Isuzu Elf",
    kapasitas: 240,
    status: "Standby",
    lokasi: "Pool Bekasi",
  },
  {
    id: "d-004",
    name: "Eko Wijayanto",
    plat: "B 9002 PV",
    armada: "Hino 500",
    kapasitas: 560,
    status: "Selesai",
  },
];

const MOCK_ROWS: MonitoringRow[] = [
  {
    id: "p-001",
    pangkalan: "Pangkalan LPG Jaya Abadi",
    alamat: "Kec. Bekasi Selatan",
    target: 1200,
    realisasi: 1150,
    pencapaianPersen: 95.8,
    status: "Selesai",
    coord: { lat: -6.2361, lng: 107.0148 },
  },
  {
    id: "p-002",
    pangkalan: "Mitra Sejahtera Gas",
    alamat: "Kec. Rawasari",
    target: 850,
    realisasi: 420,
    pencapaianPersen: 49.4,
    status: "Proses",
    coord: { lat: -6.2283, lng: 106.9885 },
  },
  {
    id: "p-003",
    pangkalan: "Pangkalan Berkah Rejeki",
    alamat: "Kec. Tambun Selatan",
    target: 1500,
    realisasi: 120,
    pencapaianPersen: 8.0,
    status: "Antrian",
    coord: { lat: -6.2455, lng: 107.0033 },
  },
  {
    id: "p-004",
    pangkalan: "Toko Gas Utama Mandiri",
    alamat: "Kec. Cilincing Pusat",
    target: 600,
    realisasi: 580,
    pencapaianPersen: 96.6,
    status: "Selesai",
    coord: { lat: -6.2212, lng: 107.0104 },
  },
  {
    id: "p-005",
    pangkalan: "Pangkalan Sinar Baru",
    alamat: "Kec. Cikarang Pusat",
    target: 900,
    realisasi: 0,
    pencapaianPersen: 0,
    status: "Tertunda",
    coord: { lat: -6.2422, lng: 106.9798 },
  },
];

const MOCK_ASSIGNMENTS: MonitoringAssignment[] = [
  {
    id: "a-001",
    driverId: "d-001",
    pangkalanId: "p-001",
    driverCoord: { lat: -6.2332, lng: 107.0057 },
  },
  {
    id: "a-002",
    driverId: "d-002",
    pangkalanId: "p-002",
    driverCoord: { lat: -6.2419, lng: 106.9955 },
  },
  {
    id: "a-003",
    driverId: "d-003",
    pangkalanId: "p-003",
    driverCoord: { lat: -6.2245, lng: 106.9921 },
  },
  {
    id: "a-004",
    driverId: "d-004",
    pangkalanId: "p-004",
    driverCoord: { lat: -6.2497, lng: 107.0131 },
  },
];

function isoNowMinute() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString();
}

export async function getMonitoringSnapshot(_dateRange: {
  from: string;
  to: string;
}): Promise<MonitoringSnapshot> {
  await delay();
  return {
    drivers: MOCK_DRIVERS,
    rows: MOCK_ROWS,
    assignments: MOCK_ASSIGNMENTS,
    lastSyncAt: isoNowMinute(),
  };
}

export async function getDriverCards(_dateRange: {
  from: string;
  to: string;
}): Promise<DriverCard[]> {
  const snapshot = await getMonitoringSnapshot(_dateRange);
  return snapshot.drivers;
}

export async function getMonitoringTable(_dateRange: {
  from: string;
  to: string;
}): Promise<MonitoringRow[]> {
  const snapshot = await getMonitoringSnapshot(_dateRange);
  return snapshot.rows;
}
