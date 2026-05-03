export type PaymentStatus = "Menunggu Verifikasi" | "Terverifikasi" | "Ditolak";
export type BankName = "BCA" | "BNI" | "Mandiri" | "BRI" | "BSI";

export interface Payment {
  id: string;
  pangkalan: string;
  jumlahTabung: number;
  nominal: number;
  bank: BankName;
  noRekening: string;
  tanggalBayar: string;
  status: PaymentStatus;
  buktiTransfer?: string;
  keterangan?: string;
}

export interface VerificationPayload {
  paymentId: string;
  action: "verify" | "reject";
  keterangan?: string;
}
