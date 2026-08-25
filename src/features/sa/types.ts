export type SAStatus = "Aktif" | "Selesai" | "Draft" | "Limit";

export interface ScheduleAgreement {
  id: string;
  nomorSA: string;
  supplier: string;
  /** ISO date — formatted at the point of display. */
  periodeMulai: string;
  periodeBerakhir: string;
  totalKuota: number;
  sudahDidistribusikan: number;
  sisaKuota: number;
  status: SAStatus;
  /** Days until the period closes; negative once it has passed. */
  sisaHari: number;
  catatan?: string;
  namaDokumen?: string;
  diunggahOleh: string;
  diunggahPada: string;
  /** Confirmed plans drawing on this agreement. */
  jumlahRencana: number;
}

export interface SAFilterParams {
  bulan?: number;
  tahun?: number;
  status?: SAStatus | "Semua";
  search?: string;
}

export interface UploadSAPayload {
  nomorSA: string;
  supplier: string;
  periodeMulai: string;
  periodeBerakhir: string;
  totalKuota: number;
  notes?: string;
  namaDokumen?: string;
}
