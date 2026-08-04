import { getDb, latency } from "@/mocks/db";
import { decidePayment } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import type { PaymentEntity } from "@/mocks/types";
import type {
  Payment,
  PaymentStatus,
  PaymentTotals,
  VerificationPayload,
} from "../types";

function toView(p: PaymentEntity): Payment {
  const db = getDb();
  const pkl = db.pangkalan.find((x) => x.id === p.pangkalanId);
  const delivery = db.deliveries.find((d) => d.id === p.deliveryId);

  return {
    id: p.id,
    kode: p.kode,
    pangkalanId: p.pangkalanId,
    pangkalan: pkl?.nama ?? "—",
    kecamatan: pkl?.kecamatan ?? "—",
    jumlahTabung: p.jumlahTabung,
    nominal: p.nominal,
    bank: p.bank,
    noRekening: p.noRekening,
    tanggalBayar: p.tanggalBayar,
    status: p.status,
    buktiTransfer: p.buktiTransfer,
    keterangan: p.keterangan,
    suratJalan: delivery?.kode,
    diverifikasiOleh: p.diverifikasiOleh,
    diverifikasiPada: p.diverifikasiPada,
  };
}

export async function getPaymentList(
  status?: PaymentStatus,
  search?: string,
): Promise<Payment[]> {
  await latency("read");
  return getDb()
    .payments.map(toView)
    .filter((p) => {
      if (status && p.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.pangkalan.toLowerCase().includes(q) ||
          p.kode.toLowerCase().includes(q) ||
          p.noRekening.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.tanggalBayar.localeCompare(a.tanggalBayar));
}

export async function getPaymentTotals(): Promise<PaymentTotals> {
  await latency("read");
  const all = getDb().payments;
  const sum = (s: PaymentStatus) =>
    all.filter((p) => p.status === s).reduce((acc, p) => acc + p.nominal, 0);
  const count = (s: PaymentStatus) => all.filter((p) => p.status === s).length;

  return {
    menunggu: count("Menunggu Verifikasi"),
    menungguNominal: sum("Menunggu Verifikasi"),
    terverifikasi: count("Terverifikasi"),
    terverifikasiNominal: sum("Terverifikasi"),
    ditolak: count("Ditolak"),
    ditolakNominal: sum("Ditolak"),
  };
}

export async function verifyPayment(payload: VerificationPayload) {
  await latency("write");
  return toView(decidePayment(payload.paymentId, payload.action, payload.keterangan));
}

export async function rejectPayment(payload: VerificationPayload) {
  return verifyPayment({ ...payload, action: "reject" });
}

/** Verifies a batch in one pass, reporting which ones could not be settled. */
export async function verifyPaymentBatch(ids: string[]) {
  await latency("write");
  const failures: string[] = [];
  let verified = 0;
  for (const id of ids) {
    try {
      decidePayment(id, "verify");
      verified += 1;
    } catch (error) {
      failures.push((error as Error).message);
    }
  }
  return { verified, failures };
}

export async function exportPayments(status?: PaymentStatus) {
  await latency("read");
  const rows = await getPaymentList(status);
  exportCsv(
    `pembayaran-${status ? status.toLowerCase().replace(/\s+/g, "-") : "semua"}-${timestampSuffix()}`,
    [
      "No. Invoice",
      "Pangkalan",
      "Kecamatan",
      "Surat Jalan",
      "Tabung",
      "Nominal",
      "Bank",
      "No. Rekening",
      "Tanggal Bayar",
      "Status",
      "Diverifikasi Oleh",
      "Keterangan",
    ],
    rows.map((p) => [
      p.kode,
      p.pangkalan,
      p.kecamatan,
      p.suratJalan ?? "",
      p.jumlahTabung,
      p.nominal,
      p.bank,
      p.noRekening,
      new Date(p.tanggalBayar).toLocaleString("id-ID"),
      p.status,
      p.diverifikasiOleh ?? "",
      p.keterangan ?? "",
    ]),
  );
  return rows.length;
}
