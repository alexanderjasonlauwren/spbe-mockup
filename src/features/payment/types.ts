export type PaymentStatus = "Menunggu Verifikasi" | "Terverifikasi" | "Ditolak";
export type BankName = "BCA" | "BNI" | "Mandiri" | "BRI" | "BSI";

export interface Payment {
  id: string;
  /** Invoice number — read digit by digit, so always shown in mono. */
  kode: string;
  pangkalanId: string;
  pangkalan: string;
  kecamatan: string;
  jumlahTabung: number;
  nominal: number;
  bank: BankName;
  noRekening: string;
  /** ISO datetime. */
  tanggalBayar: string;
  status: PaymentStatus;
  buktiTransfer?: string;
  keterangan?: string;
  /** Surat jalan this invoice was raised against, when there is one. */
  suratJalan?: string;
  diverifikasiOleh?: string;
  diverifikasiPada?: string;
}

export interface VerificationPayload {
  paymentId: string;
  action: "verify" | "reject";
  keterangan?: string;
}

export interface PaymentTotals {
  menunggu: number;
  menungguNominal: number;
  terverifikasi: number;
  terverifikasiNominal: number;
  ditolak: number;
  ditolakNominal: number;
}
