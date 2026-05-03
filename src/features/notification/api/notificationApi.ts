import { MOCK_DELAY_MS } from "@/utils/constants";
import type { Notification, ReminderSettings } from "../types";

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

const mockNotifications: Notification[] = [
  {
    id: "notif-001",
    type: "Alert",
    title: "Stok Kritis!",
    message:
      "Sisa kuota SA bulan Mei tinggal 15%. Segera lakukan perencanaan distribusi ulang.",
    timestamp: "1 Mei 2026, 10:00",
    isRead: false,
  },
  {
    id: "notif-002",
    type: "Pengingat",
    title: "SA akan kedaluwarsa",
    message: "Schedule Agreement SA-2026-001 akan berakhir dalam 7 hari.",
    timestamp: "1 Mei 2026, 08:00",
    isRead: false,
  },
  {
    id: "notif-003",
    type: "Pengingat",
    title: "Pembayaran menunggu verifikasi",
    message:
      "Terdapat 2 pembayaran dari Pangkalan LPG Jaya Abadi yang belum diverifikasi.",
    timestamp: "30 Apr 2026, 15:30",
    isRead: true,
  },
  {
    id: "notif-004",
    type: "Sistem",
    title: "Sinkronisasi data selesai",
    message:
      "Data distribusi dari Pertamina berhasil disinkronisasi. 8 record baru ditambahkan.",
    timestamp: "30 Apr 2026, 12:00",
    isRead: true,
  },
  {
    id: "notif-005",
    type: "Alert",
    title: "Keterlambatan pengiriman",
    message:
      "Driver Budi Santoso melaporkan keterlambatan 2 jam untuk rute Bekasi Selatan.",
    timestamp: "30 Apr 2026, 09:45",
    isRead: false,
  },
  {
    id: "notif-006",
    type: "Sistem",
    title: "Laporan bulanan tersedia",
    message:
      "Laporan distribusi April 2026 telah selesai diproses dan siap diunduh.",
    timestamp: "29 Apr 2026, 07:00",
    isRead: true,
  },
];

const defaultSettings: ReminderSettings = {
  saExpiry: true,
  stockLow: true,
  paymentPending: true,
  deliveryDelay: false,
  stockThresholdPct: 20,
};

export async function getNotifications(): Promise<Notification[]> {
  await delay();
  return [...mockNotifications];
}

export async function markAsRead(id: string): Promise<void> {
  await delay();
  const n = mockNotifications.find((n) => n.id === id);
  if (n) n.isRead = true;
}

export async function markAllAsRead(): Promise<void> {
  await delay();
  mockNotifications.forEach((n) => (n.isRead = true));
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  await delay();
  return { ...defaultSettings };
}

export async function saveReminderSettings(
  settings: ReminderSettings,
): Promise<void> {
  await delay();
  Object.assign(defaultSettings, settings);
}
