/**
 * Entity model for the in-browser mock backend.
 *
 * These are the *storage* shapes — normalised, id-linked, and close to what a
 * real API would return. Feature APIs map them into the view shapes that pages
 * already consume (`src/features/<x>/types.ts`), so swapping in a real backend
 * means rewriting only `src/features/<x>/api/*`.
 */

export type ID = string;

/* ── tenancy ───────────────────────────────────────────────────────────── */

/**
 * Mirrors iam.tenants / core.branches in the Go schema.
 *
 * Tenant is the isolation boundary and is fixed by the session — it is never
 * user-switchable here. Branch is the operational node inside it and is what
 * the scope switcher changes.
 */
export interface TenantEntity {
  id: ID;
  kode: string;
  nama: string;
  aktif: boolean;
}

export interface BranchEntity {
  id: ID;
  tenantId: ID;
  kode: string;
  nama: string;
  kota: string;
  provinsi: string;
  alamat: string;
  penanggungJawab: string;
  telepon: string;
  /** Depot coordinates — core.branches.location in the schema. */
  lat: number;
  lng: number;
  /** The branch loaded at login when none is specified. */
  utama: boolean;
  aktif: boolean;
}

/** The four authorisation levels the backend defines on iam.user_roles. */
export type ScopeType = "global" | "tenant" | "branch" | "pangkalan";

/** Everything that scopes a row. Present on every operational entity. */
export interface Scoped {
  tenantId: ID;
  branchId: ID;
}

export type PangkalanStatus = "Aktif" | "Nonaktif" | "Ditangguhkan";

export interface PangkalanEntity extends Scoped {
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

  /* ── credit control ── */
  /** Payment terms in days. 0 means cash on delivery. */
  termin: number;
  /** Credit ceiling in rupiah. 0 means no limit. */
  batasKredit: number;
  /** Refuse to dispatch when the outlet is over limit or overdue. */
  blokirOtomatis: boolean;
}

export type DriverStatusEntity =
  | "Standby"
  | "Dalam Perjalanan"
  | "Bongkar Muat"
  | "Selesai"
  | "Cuti";

export interface DriverEntity extends Scoped {
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

export interface SAEntity extends Scoped {
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

export interface PlanEntity extends Scoped {
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

export interface DeliveryEntity extends Scoped {
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

export type BankNameEntity = "BCA" | "BNI" | "Mandiri" | "BRI" | "BSI";

/* ── accounts receivable ───────────────────────────────────────────────── */

export type InvoiceStatus =
  | "Terbit"
  | "Sebagian"
  | "Lunas"
  | "Jatuh Tempo"
  | "Batal";

/**
 * What a pangkalan owes. Separate from the cash that settles it: one transfer
 * can pay several invoices, and one invoice can be settled by several
 * transfers, so the two cannot share a record.
 */
export interface InvoiceEntity extends Scoped {
  id: ID;
  nomor: string;
  pangkalanId: ID;
  deliveryId: ID | null;
  tanggal: string;
  /** Derived from the outlet's payment terms at the time of issue. */
  jatuhTempo: string;
  jumlahTabung: number;
  hargaSatuan: number;
  subtotal: number;
  /** Zero for now; the column exists so adding PPN is not another migration. */
  pajak: number;
  total: number;
  /** Sum of allocations against this invoice. */
  terbayar: number;
  /** Credit notes applied. */
  kredit: number;
  status: InvoiceStatus;
  catatan?: string;
  dibuatOleh: string;
}

export type PaymentStatusEntity =
  | "Menunggu Verifikasi"
  | "Terverifikasi"
  | "Ditolak";

/** Money applied from one receipt to one invoice. */
export interface PaymentAllocation {
  invoiceId: ID;
  jumlah: number;
}

/** Cash received from a pangkalan, which may settle several invoices. */
export interface PaymentEntity extends Scoped {
  id: ID;
  nomor: string;
  pangkalanId: ID;
  tanggal: string;
  jumlah: number;
  bank: BankNameEntity;
  noRekening: string;
  rekeningTujuanId?: ID;
  status: PaymentStatusEntity;
  /** Empty until the receipt is applied to invoices. */
  alokasi: PaymentAllocation[];
  buktiTransfer?: string;
  keterangan?: string;
  diverifikasiOleh?: string;
  diverifikasiPada?: string;
}

export type CreditNoteStatus = "Terbit" | "Terpakai" | "Batal";

/** A reduction of what is owed — returned cylinders, or a billing correction. */
export interface CreditNoteEntity extends Scoped {
  id: ID;
  nomor: string;
  pangkalanId: ID;
  invoiceId: ID | null;
  tanggal: string;
  jumlah: number;
  alasan: string;
  status: CreditNoteStatus;
  dibuatOleh: string;
}

/* ── general ledger ────────────────────────────────────────────────────── */

export type AccountType =
  | "Aset"
  | "Kewajiban"
  | "Ekuitas"
  | "Pendapatan"
  | "Beban";

/**
 * Roles let the posting rules find an account without hardcoding its code, so
 * the chart can be renumbered without touching business logic.
 */
export type AccountRole =
  | "kas"
  | "bank"
  | "piutang"
  | "persediaan"
  | "pendapatan"
  | "returPenjualan"
  | "hpp"
  | "ppnKeluaran"
  | "labaDitahan";

export interface AccountEntity {
  id: ID;
  kode: string;
  nama: string;
  tipe: AccountType;
  /** Which side increases this account. */
  saldoNormal: "debit" | "kredit";
  /** Parent account code, for the indented chart. */
  induk?: string;
  role?: AccountRole;
  /** Accounts the posting rules depend on cannot be deleted. */
  sistem: boolean;
  aktif: boolean;
}

export interface JournalLine {
  akunId: ID;
  debit: number;
  kredit: number;
  memo?: string;
}

export type JournalSourceType =
  | "invoice"
  | "payment"
  | "creditNote"
  | "delivery"
  | "manual";

/**
 * A posted journal is immutable. Corrections are made by posting a reversal,
 * which is what an auditor expects to see.
 */
export interface JournalEntity extends Scoped {
  id: ID;
  nomor: string;
  tanggal: string;
  keterangan: string;
  sumber: { tipe: JournalSourceType; id: ID };
  lines: JournalLine[];
  status: "Diposting" | "Dibatalkan";
  /** Set on a reversal, pointing at the entry it cancels. */
  reversalDari?: ID;
  dibuatOleh: string;
  dibuatPada: string;
}

export type ReceiptStatus = "Menunggu Review" | "Tervalidasi" | "Ditolak";

export interface ReceiptEntity extends Scoped {
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
  /** The reminder rule that produced this, when one did. */
  rule?: ReminderRuleKey;
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
  /** Empty = tenant-wide. One entry = a single-branch user. */
  branchIds: ID[];
  scopeType: ScopeType;
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
export interface OrderEntity extends Scoped {
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

/* ── system configuration ──────────────────────────────────────────────── */

/** An SPBE the agency draws quota from. Referenced by Schedule Agreements. */
export interface SpbeEntity {
  id: ID;
  kode: string;
  nama: string;
  alamat: string;
  penanggungJawab: string;
  telepon: string;
  aktif: boolean;
}

/** An account pangkalan transfer into. Finance reconciles against these. */
export interface BankAccountEntity {
  id: ID;
  bank: BankNameEntity;
  nomorRekening: string;
  atasNama: string;
  cabang: string;
  /** The account printed on invoices by default. */
  utama: boolean;
  aktif: boolean;
}

/** Document prefixes. Visible on every table row and printout. */
export interface NumberingEntity {
  suratJalan: string;
  invoice: string;
  rencana: string;
  pesanan: string;
  /** Whether the running number is scoped per day, e.g. SJ-20260804-01. */
  sertakanTanggal: boolean;
}

export interface OperationsEntity {
  /** Days the agency dispatches, 0 = Sunday. */
  hariKerja: number[];
  /** Minutes budgeted per stop — drives the width of a block on the rail. */
  durasiSinggahMenit: number;
  /** How many days ahead a plan may be created. */
  leadTimeHari: number;
}

/* ── notification rules ────────────────────────────────────────────────── */

export type ReminderRuleKey =
  | "saExpiry"
  | "quotaLow"
  | "stockLow"
  | "paymentPending"
  | "deliveryDelay"
  | "planUnconfirmed"
  | "orderPending";

export type NotifChannel = "app" | "whatsapp" | "email";

export interface ReminderRule {
  aktif: boolean;
  /** Threshold; the unit differs per rule and is stated in the UI. */
  ambang: number;
  /** Roles that receive it. */
  penerima: UserEntity["role"][];
  kanal: NotifChannel[];
}

export interface WhatsappSettings {
  aktif: boolean;
  nomorPengirim: string;
  templatePengingat: string;
}

export interface NotificationSettings {
  rules: Record<ReminderRuleKey, ReminderRule>;
  whatsapp: WhatsappSettings;
  email: { aktif: boolean; pengirim: string };
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
  notifikasi: NotificationSettings;
  penomoran: NumberingEntity;
  operasi: OperationsEntity;
  tema: "terang" | "gelap" | "sistem";
}

export interface Database {
  version: number;
  seededAt: string;
  tenant: TenantEntity;
  branches: BranchEntity[];
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
  spbe: SpbeEntity[];
  bankAccounts: BankAccountEntity[];
  accounts: AccountEntity[];
  journals: JournalEntity[];
  invoices: InvoiceEntity[];
  creditNotes: CreditNoteEntity[];
  settings: SettingsEntity;
}
