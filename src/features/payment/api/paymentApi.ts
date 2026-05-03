import { MOCK_DELAY_MS } from "@/utils/constants";
import type { Payment, PaymentStatus, VerificationPayload } from "../types";

function delay() {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

const mockPayments: Payment[] = [
  {
    id: "pay-001",
    pangkalan: "Pangkalan LPG Jaya Abadi",
    jumlahTabung: 120,
    nominal: 1440000,
    bank: "BCA",
    noRekening: "1234-5678-9012",
    tanggalBayar: "1 Mei 2026, 08:42",
    status: "Menunggu Verifikasi",
    keterangan: "Transfer via mobile banking",
  },
  {
    id: "pay-002",
    pangkalan: "Mitra Sejahtera Gas",
    jumlahTabung: 100,
    nominal: 1200000,
    bank: "Mandiri",
    noRekening: "9876-5432-1098",
    tanggalBayar: "1 Mei 2026, 09:15",
    status: "Menunggu Verifikasi",
  },
  {
    id: "pay-003",
    pangkalan: "Toko Gas Utama Mandiri",
    jumlahTabung: 80,
    nominal: 960000,
    bank: "BNI",
    noRekening: "4567-8901-2345",
    tanggalBayar: "30 Apr 2026, 14:00",
    status: "Terverifikasi",
  },
  {
    id: "pay-004",
    pangkalan: "Pangkalan Berkah Rejeki",
    jumlahTabung: 150,
    nominal: 1800000,
    bank: "BRI",
    noRekening: "1111-2222-3333",
    tanggalBayar: "29 Apr 2026, 11:00",
    status: "Ditolak",
    keterangan: "Nominal tidak sesuai",
  },
  {
    id: "pay-005",
    pangkalan: "Pangkalan Sinar Baru",
    jumlahTabung: 60,
    nominal: 720000,
    bank: "BSI",
    noRekening: "5555-6666-7777",
    tanggalBayar: "29 Apr 2026, 09:30",
    status: "Terverifikasi",
  },
];

export async function getPaymentList(
  status?: PaymentStatus,
): Promise<Payment[]> {
  await delay();
  if (!status) return mockPayments;
  return mockPayments.filter((p) => p.status === status);
}

export async function verifyPayment(
  payload: VerificationPayload,
): Promise<void> {
  await delay();
  const p = mockPayments.find((p) => p.id === payload.paymentId);
  if (p) p.status = payload.action === "verify" ? "Terverifikasi" : "Ditolak";
}

export async function rejectPayment(
  payload: VerificationPayload,
): Promise<void> {
  return verifyPayment({ ...payload, action: "reject" });
}
