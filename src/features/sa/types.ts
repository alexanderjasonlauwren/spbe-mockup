export type SAStatus = "Aktif" | "Selesai" | "Draft" | "Limit";

export interface ScheduleAgreement {
  id: string;
  nomorSA: string;
  spbe: string;
  periodeMultai: string;
  periodeBerakhir: string;
  totalKuota: number;
  sudahDidistribusikan: number;
  sisaKuota: number;
  status: SAStatus;
}

export interface SAFilterParams {
  bulan?: number;
  tahun?: number;
  status?: SAStatus | "Semua";
  search?: string;
}

export interface UploadSAPayload {
  nomorSA: string;
  spbe: string;
  periodeMultai: string;
  periodeBerakhir: string;
  totalKuota: number;
  notes?: string;
}
