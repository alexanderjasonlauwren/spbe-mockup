/**
 * Entity model for the in-browser mock backend.
 *
 * These are the *storage* shapes — normalised, id-linked, and close to what a
 * real API would return. Feature APIs map them into the view shapes that pages
 * already consume (`src/features/<x>/types.ts`), so swapping in a real backend
 * means rewriting only `src/features/<x>/api/*`.
 */

export type ID = string;

export type { GeoStamp } from "@/lib/geo";
import type { GeoStamp } from "@/lib/geo";

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

  /**
   * The tenant this one sits under. `null` for a root.
   *
   * A tenant may own sub-tenants running different businesses, which may in
   * turn own sub-tenants and branches — an LPG holding with a water-depot
   * subsidiary is the case the model exists for.
   */
  indukId: ID | null;

  /**
   * How deep in the tree, counted from the ROOT — not from whoever is looking.
   *
   * Also the number of ancestors it has. Absolute on purpose, so two people
   * acting as different tenants describe the same tenant the same way. A
   * switcher rendering indentation must subtract its own depth, or a
   * subsidiary's tree draws off the left edge of the panel.
   */
  level: number;

  /**
   * What business this tenant runs, which decides its starting vocabulary and
   * the product categories available to it.
   *
   * Deliberately does NOT inherit: a water-depot subsidiary of an LPG holding
   * must not pick up "LPG" from its parent. Contrast with `SettingsEntity`,
   * which does inherit.
   */
  jenisUsaha: string;

  /** 'grup' owns others and runs nothing itself; 'operasional' does both. */
  jenis: "grup" | "operasional";
}

/**
 * A settings value, and where it came from.
 *
 * Settings inherit per FIELD: `null` means "not set here, ask my parent", so a
 * subsidiary that renames only its lexicon still follows its group's working
 * week. Rendering only the effective value loses that distinction — and a form
 * that saved it back would turn every inherited value into an override the
 * parent could never change again.
 *
 * So the shape carries both: what applies, and whether this tenant chose it.
 */
export interface Inherited<T> {
  /** What applies, after inheritance. Never null once anything up the tree set it. */
  nilai: T | null;
  /** The tenant that supplied it, or `null` when this tenant set it itself. */
  diwarisiDari: { id: ID; kode: string; nama: string } | null;
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
export type ScopeType = "global" | "tenant" | "branch" | "outlet";

/** Everything that scopes a row. Present on every operational entity. */
export interface Scoped {
  tenantId: ID;
  branchId: ID;
}

export type OutletStatus = "Aktif" | "Nonaktif" | "Ditangguhkan";

export interface OutletEntity extends Scoped {
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
  status: OutletStatus;
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
  supplier: string;
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
  outletId: ID;
  driverId: ID | null;
  lines: PlanRowLine[];
  /** Derived: total units across `lines`. */
  jumlahUnit: number;
  jamPengiriman: string; // "HH:mm"
}

/* ── transaction lines ─────────────────────────────────────────────────── */

/**
 * What is being moved, and how much of it.
 *
 * Lines are the source of truth on every transaction. The scalar totals beside
 * them (`jumlahUnit`, `target`, `realisasi`) are derived and kept in step by
 * the rules layer — they exist so the many screens that only need "how many
 * units" do not each have to sum a line set.
 *
 * Before this, a transaction carried a bare quantity of an *implicit* product
 * and every invoice was priced from one global setting. A catalogue with 3 kg,
 * 12 kg and 50 kg cylinders in it was therefore billed entirely at the 3 kg
 * price, and posted cost of goods at the 3 kg cost.
 */
export interface OrderLine {
  productId: ID;
  jumlah: number;
}

export type PlanRowLine = OrderLine;

export interface DeliveryLine {
  productId: ID;
  /** Loaded onto the truck. */
  target: number;
  /** Accepted at the drop — what the invoice is raised from. */
  realisasi: number;
  /** Empty containers collected in exchange, for returnable products. */
  kembali?: number;
}

/**
 * A priced line on an invoice.
 *
 * Name, unit and price are snapshotted rather than joined: an invoice must
 * reprint identically years later, after the product has been renamed and
 * repriced. Reading them live from the catalogue would silently rewrite issued
 * documents.
 */
export interface InvoiceLine {
  productId: ID;
  nama: string;
  satuan: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
}

export type DeliveryStatus = "Antrian" | "Proses" | "Selesai" | "Tertunda";

export interface DeliveryEntity extends Scoped {
  id: ID;
  kode: string; // surat jalan number
  planId: ID;
  planRowId: ID;
  outletId: ID;
  driverId: ID;
  tanggal: string; // ISO date
  jamRencana: string; // "HH:mm"
  lines: DeliveryLine[];
  /** Derived from `lines`: total units loaded, accepted, and collected back. */
  target: number;
  realisasi: number;
  status: DeliveryStatus;
  mulaiPada?: string;
  selesaiPada?: string;
  driverLat?: number;
  driverLng?: number;
  /**
   * Empty cylinders collected at the drop.
   *
   * Recorded by the sopir, not derived: an outlet rarely returns exactly what
   * it receives, and the difference is what cylinder reconciliation is about.
   */
  unitKembali?: number;
  /** Who signed for the load — the proof-of-delivery the driver captures. */
  diterimaOleh?: string;
  catatan?: string;
}

/* ── delivery events ───────────────────────────────────────────────────── */

export type DeliveryEventType = "berangkat" | "selesai" | "tertunda";

/**
 * One thing the sopir filed, and where they were when they filed it.
 *
 * An append-only log rather than fields on the delivery, because a drop can be
 * departed, attempted, held and re-attempted — and the position at each of
 * those is a separate fact. Overwriting one slot would keep only the last.
 *
 * Mirrors core.delivery_events in the Go schema.
 */
export interface DeliveryEventEntity extends Scoped {
  id: ID;
  deliveryId: ID;
  driverId: ID;
  tipe: DeliveryEventType;
  at: string;
  aktor: string;
  posisi: GeoStamp;
  /**
   * Metres between the fix and the outlet, frozen at the time of filing.
   *
   * Stored rather than derived: re-pinning a outlet later would silently
   * rewrite history, and this figure is what an auditor reads.
   */
  jarakMeter?: number;
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
 * What a outlet owes. Separate from the cash that settles it: one transfer
 * can pay several invoices, and one invoice can be settled by several
 * transfers, so the two cannot share a record.
 */
export interface InvoiceEntity extends Scoped {
  id: ID;
  nomor: string;
  outletId: ID;
  deliveryId: ID | null;
  tanggal: string;
  /** Derived from the outlet's payment terms at the time of issue. */
  jatuhTempo: string;
  lines: InvoiceLine[];
  /** Derived from `lines`. `hargaSatuan` is a blended average once mixed. */
  jumlahUnit: number;
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

/** Cash received from a outlet, which may settle several invoices. */
export interface PaymentEntity extends Scoped {
  id: ID;
  nomor: string;
  outletId: ID;
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
  outletId: ID;
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

/**
 * One item read off a scanned receipt.
 *
 * `productId` is nullable on purpose. A scan reads text, not identifiers, and
 * "LPG 3KG SUBS." may match nothing in the catalogue — the same honest
 * unmatched state `outletId` and `bank` already carry. Forcing every line
 * onto a default product would silently bill the wrong item at the wrong price,
 * which is precisely the failure a review step exists to prevent.
 *
 * `namaTerbaca` keeps the raw text so the reviewer can see what the matcher was
 * working from, rather than only its conclusion.
 *
 * Mirrors ocr.receipt_items in the Go schema.
 */
export interface ReceiptLine {
  productId: ID | null;
  namaTerbaca: string;
  jumlah: number;
  /** As printed on the paper — what the customer was actually charged. */
  hargaSatuan: number;
}

export interface ReceiptEntity extends Scoped {
  id: ID;
  namaBerkas: string;
  outletId: ID | null;
  nomorKwitansi: string;
  tanggalKwitansi: string;
  lines: ReceiptLine[];
  /** Derived from `lines`. Named for units, not cylinders — a receipt may
   *  itemise anything the agency sells. */
  jumlahUnit: number;
  /**
   * The total the document states, read separately from the items.
   *
   * Deliberately not derived: OCR reads the printed total and the line items as
   * two independent facts, and a disagreement between them is the strongest
   * signal that the scan is wrong. Computing one from the other would destroy
   * the check.
   */
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
  role: "admin" | "manager" | "finance" | "staff" | "viewer" | "driver";
  telepon: string;
  /**
   * The fleet record this account drives, for `driver` accounts.
   *
   * A console user and a truck are different things — a dispatcher covering a
   * route is still not the driver — so the link is explicit rather than matched
   * on name. Without it a sopir signs in and the console cannot tell whose run
   * to show.
   */
  driverId?: ID;
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
  /**
   * The counting noun for one unit: tabung, botol, dus, sak.
   *
   * The single concession to businesses other than LPG at this stage. Kept on
   * the product rather than in a global setting because a catalogue can mix
   * them, and deliberately not built out further until a real second business
   * says what else needs to vary.
   */
  satuan: string;
  /** Whether the customer hands back an empty in exchange for a full one. */
  returnable: boolean;
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

/** An order placed by a outlet. Approved orders feed distribution planning. */
export interface OrderEntity extends Scoped {
  id: ID;
  kode: string;
  outletId: ID;
  lines: OrderLine[];
  /** Derived: total units across `lines`. */
  jumlahUnit: number;
  tanggalMasuk: string; // ISO datetime
  tanggalDiminta: string; // ISO date
  status: OrderStatus;
  planId?: ID;
  catatan?: string;
  diprosesOleh?: string;
  diprosesPada?: string;
}

/* ── system configuration ──────────────────────────────────────────────── */

/** A supply source the agency draws quota from. Referenced by Schedule Agreements. */
export interface SupplierEntity {
  id: ID;
  kode: string;
  nama: string;
  alamat: string;
  penanggungJawab: string;
  telepon: string;
  aktif: boolean;
}

/** An account outlets transfer into. Finance reconciles against these. */
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
  /**
   * Whether the console records where the sopir was when they filed a drop.
   *
   * A switch rather than an assumption: this is location data about employees,
   * and whether to collect it is the agency's decision to make and to be able
   * to answer for.
   */
  rekamLokasi: boolean;
  /**
   * How close to the outlet a submission has to be to count as "at the drop".
   *
   * Mirrors geofence_rules.radius_meter — per-outlet radii belong there
   * eventually; this is the agency-wide default.
   */
  radiusGeofenceMeter: number;
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

/**
 * What this tenant calls the three things every screen has to name.
 *
 * The console's own words are role names — outlet, supplier, unit — because
 * the roles are what generalise across verticals. The nouns on screen are the
 * tenant's: an LPG agency reads pangkalan / SPBE / tabung, a water depot reads
 * depot / pabrik / galon. Read through `lib/lexicon`, never inlined.
 *
 * `satuan` also replaced a global `hargaPerTabung`, which priced every product
 * in the catalogue identically and stopped meaning anything once invoices
 * carried lines. Prices belong on products; only the noun is agency-wide.
 */
export interface LexiconEntity {
  /** One unit of the thing moved: tabung, galon, dus, sak. */
  satuan: string;
  /** A delivery destination: pangkalan, depot, toko, gerai. */
  outlet: string;
  /** A supply source drawn against: SPBE, pabrik, distributor pusat. */
  pemasok: string;
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
  /** The tenant's own vocabulary. See `LexiconEntity`. */
  istilah: LexiconEntity;
  targetHarian: number;
  notifikasi: NotificationSettings;
  penomoran: NumberingEntity;
  operasi: OperationsEntity;
  tema: "terang" | "gelap" | "sistem";
}

/**
 * One tenant's own settings, with the fields it has chosen to set.
 *
 * `Partial`, and that is the whole design: a field absent here means "not set
 * for this tenant, ask its parent". It mirrors iam.tenant_settings, where every
 * column is nullable and NULL means inherit — so a subsidiary that renames only
 * its lexicon still follows its group's working week.
 *
 * Flattening this to a full SettingsEntity per tenant would lose the
 * distinction, and saving the resolved values back would silently turn every
 * inherited value into an override the parent could never change again.
 */
export interface TenantSettingsEntity {
  tenantId: ID;
  values: Partial<SettingsEntity>;
}

/**
 * Where a settings field came from, for one tenant.
 *
 * Mirrors the backend's GET /tenants/:id/settings, which returns the same three
 * parts for the same reason: a form that only had the effective values would
 * save them back and turn every inherited value into an override.
 */
export interface ResolvedSettingsEntity {
  /** What this tenant has set for itself. Absent field = inherited. */
  own: Partial<SettingsEntity>;
  /** What actually applies, after inheritance. Always complete. */
  effective: SettingsEntity;
  /**
   * The tenant each inherited field came from, keyed by field name. A field
   * absent from this map was either set here or is unset everywhere.
   */
  inheritedFrom: Partial<Record<keyof SettingsEntity, TenantEntity>>;
}

export interface Database {
  version: number;
  seededAt: string;
  /**
   * Every tenant in the tree, not one.
   *
   * Was `tenant: TenantEntity` while tenancy was flat and fixed by the session.
   * The console now switches between them, so the store has to hold the shape
   * the switcher renders.
   */
  tenants: TenantEntity[];
  branches: BranchEntity[];
  outlets: OutletEntity[];
  drivers: DriverEntity[];
  scheduleAgreements: SAEntity[];
  plans: PlanEntity[];
  planRows: PlanRowEntity[];
  deliveries: DeliveryEntity[];
  deliveryEvents: DeliveryEventEntity[];
  payments: PaymentEntity[];
  receipts: ReceiptEntity[];
  notifications: NotificationEntity[];
  audit: AuditEntry[];
  users: UserEntity[];
  products: ProductEntity[];
  orders: OrderEntity[];
  suppliers: SupplierEntity[];
  bankAccounts: BankAccountEntity[];
  accounts: AccountEntity[];
  journals: JournalEntity[];
  invoices: InvoiceEntity[];
  creditNotes: CreditNoteEntity[];
  /**
   * The acting tenant's settings, already resolved up the tree.
   *
   * Kept as a plain SettingsEntity because a dozen readers across the console
   * want the effective value and nothing else — a print header wants the agency
   * name, not the question of who set it. `getDb()` resolves it from
   * `settingsByTenant` on every read.
   */
  settings: SettingsEntity;
  /** Per-tenant overrides. The stored truth; `settings` above is derived. */
  settingsByTenant: TenantSettingsEntity[];
}
