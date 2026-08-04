/**
 * Entity model for the in-browser mock backend.
 *
 * These are the *storage* shapes — normalised, id-linked, and close to what a
 * real API would return. Feature APIs map them into the view shapes that pages
 * already consume (`src/features/<x>/types.ts`), so swapping in a real backend
 * means rewriting only `src/features/<x>/api/*`.
 */

export type ID = string;

export type PangkalanStatus = "Aktif" | "Nonaktif" | "Ditangguhkan";

export interface PangkalanEntity {
  id: ID;
  kode: string;
  nama: string;
  alamat: string;
  kecamatan: string;
  kota: string;
  lat: number;
  lng: number;
  penanggungJawab: string;
  telepon: string;
  status: PangkalanStatus;
  kuotaBulanan: number;
  terdaftarPada: string;
}

export type DriverStatusEntity =
  | "Standby"
  | "Dalam Perjalanan"
  | "Bongkar Muat"
  | "Selesai"
  | "Cuti";

export interface DriverEntity {
  id: ID;
  nama: string;
  telepon: string;
  nomorSim: string;
  plat: string;
  armada: string;
  kapasitas: number;
  status: DriverStatusEntity;
  bergabungPada: string;
}

export type SAStatusEntity = "Draft" | "Aktif" | "Limit" | "Selesai";

export interface SAEntity {
  id: ID;
  nomorSA: string;
  spbe: string;
  periodeMulai: string; // ISO date
  periodeBerakhir: string; // ISO date
  totalKuota: number;
  terpakai: number;
  status: SAStatusEntity;
  catatan?: string;
  namaDokumen?: string;
  diunggahOleh: string;
  diunggahPada: string;
}

export type PlanStatusEntity = "Draft" | "Terkonfirmasi" | "Selesai" | "Batal";

export interface PlanEntity {
  id: ID;
  kode: string;
  tanggal: string; // ISO date
  saId: ID;
  status: PlanStatusEntity;
  catatan?: string;
  dibuatOleh: string;
  dibuatPada: string;
  dikonfirmasiOleh?: string;
  dikonfirmasiPada?: string;
}

export interface PlanRowEntity {
  id: ID;
  planId: ID;
  pangkalanId: ID;
  driverId: ID | null;
  jumlahTabung: number;
  jamPengiriman: string; // "HH:mm"
}

export type DeliveryStatus = "Antrian" | "Proses" | "Selesai" | "Tertunda";

export interface DeliveryEntity {
  id: ID;
  kode: string; // surat jalan number
  planId: ID;
  planRowId: ID;
  pangkalanId: ID;
  driverId: ID;
  tanggal: string; // ISO date
  jamRencana: string; // "HH:mm"
  target: number;
  realisasi: number;
  status: DeliveryStatus;
  mulaiPada?: string;
  selesaiPada?: string;
  driverLat?: number;
  driverLng?: number;
  catatan?: string;
}

export type PaymentStatusEntity =
  | "Menunggu Verifikasi"
  | "Terverifikasi"
  | "Ditolak";

export type BankNameEntity = "BCA" | "BNI" | "Mandiri" | "BRI" | "BSI";

export interface PaymentEntity {
  id: ID;
  kode: string; // invoice number
  pangkalanId: ID;
  deliveryId: ID | null;
  jumlahTabung: number;
  nominal: number;
  bank: BankNameEntity;
  noRekening: string;
  tanggalBayar: string; // ISO datetime
  status: PaymentStatusEntity;
  buktiTransfer?: string;
  keterangan?: string;
  diverifikasiOleh?: string;
  diverifikasiPada?: string;
}

export type ReceiptStatus = "Menunggu Review" | "Tervalidasi" | "Ditolak";

export interface ReceiptEntity {
  id: ID;
  namaBerkas: string;
  pangkalanId: ID | null;
  nomorKwitansi: string;
  tanggalKwitansi: string;
  jumlahTabung: number;
  nominal: number;
  bank: BankNameEntity | null;
  keyakinan: number; // OCR confidence 0..1
  status: ReceiptStatus;
  diunggahPada: string;
  ditinjauOleh?: string;
  ditinjauPada?: string;
  paymentId?: ID;
}

export type NotificationTypeEntity = "Pengingat" | "Alert" | "Sistem";

export interface NotificationEntity {
  id: ID;
  type: NotificationTypeEntity;
  title: string;
  message: string;
  createdAt: string; // ISO datetime
  isRead: boolean;
  /** Where the "Buka" action should navigate. */
  href?: string;
}

export interface AuditEntry {
  id: ID;
  at: string; // ISO datetime
  actor: string;
  action: string;
  entity: string;
  entityId: ID;
  summary: string;
}

export type UserStatusEntity = "Aktif" | "Nonaktif" | "Diundang";

export interface UserEntity {
  id: ID;
  nama: string;
  email: string;
  role: "admin" | "manager" | "finance" | "staff" | "viewer";
  telepon: string;
  cabang: string;
  status: UserStatusEntity;
  terakhirMasuk?: string;
  dibuatPada: string;
}

export interface ProductEntity {
  id: ID;
  kode: string;
  nama: string;
  ukuran: string;
  hargaJual: number;
  hargaBeli: number;
  stok: number;
  stokMinimum: number;
  aktif: boolean;
}

export type OrderStatus =
  | "Baru"
  | "Disetujui"
  | "Dijadwalkan"
  | "Selesai"
  | "Ditolak";

/** An order placed by a pangkalan. Approved orders feed distribution planning. */
export interface OrderEntity {
  id: ID;
  kode: string;
  pangkalanId: ID;
  jumlahTabung: number;
  tanggalMasuk: string; // ISO datetime
  tanggalDiminta: string; // ISO date
  status: OrderStatus;
  planId?: ID;
  catatan?: string;
  diprosesOleh?: string;
  diprosesPada?: string;
}

export interface SettingsEntity {
  namaPerusahaan: string;
  nomorAgen: string;
  alamat: string;
  telepon: string;
  email: string;
  zonaWaktu: string;
  jamOperasionalMulai: string;
  jamOperasionalSelesai: string;
  hargaPerTabung: number;
  targetHarian: number;
  reminder: {
    saExpiry: boolean;
    stockLow: boolean;
    paymentPending: boolean;
    deliveryDelay: boolean;
    stockThresholdPct: number;
  };
  whatsapp: {
    aktif: boolean;
    nomorPengirim: string;
    templatePengingat: string;
  };
  tema: "terang" | "gelap" | "sistem";
}

export interface Database {
  version: number;
  seededAt: string;
  pangkalan: PangkalanEntity[];
  drivers: DriverEntity[];
  scheduleAgreements: SAEntity[];
  plans: PlanEntity[];
  planRows: PlanRowEntity[];
  deliveries: DeliveryEntity[];
  payments: PaymentEntity[];
  receipts: ReceiptEntity[];
  notifications: NotificationEntity[];
  audit: AuditEntry[];
  users: UserEntity[];
  products: ProductEntity[];
  orders: OrderEntity[];
  settings: SettingsEntity;
}
