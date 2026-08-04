/**
 * Deterministic seed data for the mock backend.
 *
 * Everything is generated relative to "today", so the console always opens on a
 * live-looking working day: finished runs behind it, a confirmed plan in
 * progress, drafts queued ahead.
 */

import { seedAccounts } from "./ledger";
import type {
  BranchEntity,
  TenantEntity,
  CreditNoteEntity,
  InvoiceEntity,
  JournalEntity,
  Database,
  DeliveryEntity,
  DriverEntity,
  NotificationEntity,
  PangkalanEntity,
  PaymentEntity,
  PlanEntity,
  PlanRowEntity,
  BankAccountEntity,
  BankNameEntity,
  NotificationSettings,
  NumberingEntity,
  OperationsEntity,
  OrderEntity,
  ProductEntity,
  SpbeEntity,
  ReceiptEntity,
  SAEntity,
  SettingsEntity,
  UserEntity,
} from "./types";

export const DB_VERSION = 3;

/* ── deterministic RNG ─────────────────────────────────────────────────── */

function mulberry32(seed: number) {
  return function rng() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260803);

const rand = () => rng();
const randInt = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

/* ── date helpers ──────────────────────────────────────────────────────── */

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function atTime(date: Date, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/* ── source vocabulary ─────────────────────────────────────────────────── */

const SPBE = [
  "SPBE Bekasi Utama",
  "SPBE Tambun Mandiri",
  "SPBE Cikarang Raya",
  "SPBE Jatiasih Sejahtera",
];

const KECAMATAN = [
  "Bekasi Selatan",
  "Bekasi Timur",
  "Bekasi Utara",
  "Bekasi Barat",
  "Rawalumbu",
  "Medan Satria",
  "Bantargebang",
  "Jatiasih",
  "Pondok Gede",
  "Tambun Selatan",
  "Cikarang Barat",
  "Cibitung",
];

const PANGKALAN_NAMA = [
  "Pangkalan Jaya Abadi",
  "Mitra Sejahtera Gas",
  "Pangkalan Berkah Rejeki",
  "Toko Gas Utama Mandiri",
  "Pangkalan Sinar Baru",
  "UD Maju Terus",
  "Pangkalan Berkah Jaya",
  "Toko Gas Sejahtera",
  "Pangkalan Ibu Ani",
  "Sumber Gas Rejeki",
  "Pangkalan Maju Jaya",
  "Pangkalan Sumber Gas",
  "Pangkalan Berkah Elpiji",
  "UD Cahaya Gas",
  "Pangkalan Amanah",
  "Toko Gas Barokah",
  "Pangkalan Rukun Santosa",
  "Mitra Gas Nusantara",
  "Pangkalan Karya Mandiri",
  "UD Sumber Makmur",
  "Pangkalan Tirta Jaya",
  "Toko Gas Harapan",
  "Pangkalan Sejahtera Abadi",
  "UD Bintang Gas",
];

const ORANG = [
  "Budi Santoso",
  "Agus Setiawan",
  "Bambang Wijaya",
  "Rahmat Hidayat",
  "Dedi Kurniawan",
  "Surya Saputra",
  "Ahmad Subarjo",
  "Rizky Ramadhan",
  "Eko Wijayanto",
  "Hendra Kurniawan",
  "Siti Nurhaliza",
  "Dewi Lestari",
  "Joko Prasetyo",
  "Rina Marlina",
  "Tono Suharto",
  "Wahyu Nugroho",
  "Indra Gunawan",
  "Fitri Handayani",
  "Yusuf Maulana",
  "Nanda Pratama",
  "Lukman Hakim",
  "Sari Wulandari",
  "Bayu Anggara",
  "Citra Dewanti",
];

const ARMADA = [
  { armada: "Isuzu Giga FVR", kapasitas: 560 },
  { armada: "Hino Ranger FM", kapasitas: 480 },
  { armada: "Isuzu Elf NMR", kapasitas: 240 },
  { armada: "Mitsubishi Fuso FN", kapasitas: 560 },
  { armada: "Hino Dutro 130", kapasitas: 320 },
];

const BANKS = ["BCA", "BNI", "Mandiri", "BRI", "BSI"] as const;

const HARGA_PER_TABUNG = 12_000;

/** The agency yard per branch. Routes start here between runs. */
export const DEPOT = { lat: -6.2607, lng: 106.9756, nama: "Pool Bekasi" };

export const TENANT: TenantEntity = {
  id: "tnt-001",
  kode: "sinar-distribusi",
  nama: "PT Sinar Distribusi Nusantara",
  aktif: true,
};

/** Three branches, so consolidated views have something to consolidate. */
export const BRANCHES: BranchEntity[] = [
  {
    id: "brc-001", tenantId: TENANT.id, kode: "BKS", nama: "Cabang Bekasi",
    kota: "Kota Bekasi", provinsi: "Jawa Barat",
    alamat: "Jl. Raya Industri No. 42, Bekasi Selatan",
    penanggungJawab: "Alex Lawrence", telepon: "021-8899-4210",
    lat: -6.2607, lng: 106.9756, utama: true, aktif: true,
  },
  {
    id: "brc-002", tenantId: TENANT.id, kode: "CKR", nama: "Cabang Cikarang",
    kota: "Kab. Bekasi", provinsi: "Jawa Barat",
    alamat: "Jl. Jababeka Raya Blok C No. 8, Cikarang",
    penanggungJawab: "Siti Nurhaliza", telepon: "021-8934-7720",
    lat: -6.2797, lng: 107.1425, utama: false, aktif: true,
  },
  {
    id: "brc-003", tenantId: TENANT.id, kode: "KRW", nama: "Cabang Karawang",
    kota: "Kab. Karawang", provinsi: "Jawa Barat",
    alamat: "Jl. Ahmad Yani No. 117, Karawang Barat",
    penanggungJawab: "Joko Prasetyo", telepon: "0267-641-880",
    lat: -6.3227, lng: 107.3376, utama: false, aktif: true,
  },
];

/** Round-robin assignment, so every branch has a working day of its own. */
function branchFor(index: number): { tenantId: string; branchId: string } {
  const b = BRANCHES[index % BRANCHES.length];
  return { tenantId: TENANT.id, branchId: b.id };
}

/* ── generators ────────────────────────────────────────────────────────── */

function seedPangkalan(): PangkalanEntity[] {
  return PANGKALAN_NAMA.map((nama, i) => {
    const kecamatan = KECAMATAN[i % KECAMATAN.length];
    const statusRoll = rand();
    return {
      ...branchFor(i),
      id: `pkl-${String(i + 1).padStart(3, "0")}`,
      kode: `PKL-${String(i + 1).padStart(4, "0")}`,
      nama,
      alamat: `Jl. ${pick(["Melati", "Kenanga", "Raya Industri", "Pahlawan", "Merdeka", "Cempaka", "Diponegoro", "Sudirman"])} No. ${randInt(1, 180)}`,
      kecamatan,
      kota: i % 5 === 0 ? "Kab. Bekasi" : "Kota Bekasi",
      lat: -6.2 - rand() * 0.09,
      lng: 106.96 + rand() * 0.09,
      penanggungJawab: ORANG[(i * 3 + 5) % ORANG.length],
      telepon: `08${randInt(11, 99)}${randInt(1000000, 9999999)}`,
      status:
        statusRoll > 0.93
          ? "Ditangguhkan"
          : statusRoll > 0.86
            ? "Nonaktif"
            : "Aktif",
      kuotaBulanan: randInt(6, 24) * 100,
      // A mix of cash-on-delivery and short terms, as an agency actually runs.
      termin: pick([0, 7, 7, 14, 14, 30]),
      batasKredit: pick([0, 5_000_000, 10_000_000, 15_000_000, 25_000_000]),
      blokirOtomatis: rand() > 0.25,
      terdaftarPada: isoDate(addDays(startOfToday(), -randInt(120, 900))),
    };
  });
}

function seedDrivers(): DriverEntity[] {
  return Array.from({ length: 8 }, (_, i) => {
    const unit = ARMADA[i % ARMADA.length];
    return {
      ...branchFor(i),
      id: `drv-${String(i + 1).padStart(3, "0")}`,
      nama: ORANG[i],
      telepon: `08${randInt(11, 99)}${randInt(1000000, 9999999)}`,
      nomorSim: `B${randInt(1000000, 9999999)}`,
      plat: `B ${randInt(1000, 9999)} ${pick(["TGH", "AB", "CK", "PV", "KYA", "RFS"])}`,
      armada: unit.armada,
      kapasitas: unit.kapasitas,
      status: i === 7 ? "Cuti" : "Standby",
      bergabungPada: isoDate(addDays(startOfToday(), -randInt(200, 1400))),
    };
  });
}

function seedScheduleAgreements(): SAEntity[] {
  const today = startOfToday();
  const y = today.getFullYear();
  const m = today.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");

  const periods = [
    { offset: -2, status: "Selesai" as const, ratio: 1 },
    { offset: -1, status: "Selesai" as const, ratio: 0.97 },
    { offset: 0, status: "Aktif" as const, ratio: 0.62 },
    { offset: 0, status: "Limit" as const, ratio: 0.985 },
    { offset: 0, status: "Aktif" as const, ratio: 0.34 },
    { offset: 1, status: "Draft" as const, ratio: 0 },
  ];

  return periods.map((p, i) => {
    const mulai = new Date(y, m + p.offset, 1);
    const berakhir = new Date(y, m + p.offset + 1, 0);
    const totalKuota = randInt(12, 60) * 10_000;
    return {
      ...branchFor(i),
      id: `sa-${String(i + 1).padStart(3, "0")}`,
      nomorSA: `SA-${mulai.getFullYear()}-${pad(mulai.getMonth() + 1)}-${pad(randInt(1, 99))}`,
      spbe: SPBE[i % SPBE.length],
      periodeMulai: isoDate(mulai),
      periodeBerakhir: isoDate(berakhir),
      totalKuota,
      terpakai: Math.round(totalKuota * p.ratio),
      status: p.status,
      diunggahOleh: "Alex Lawrence",
      diunggahPada: atTime(addDays(mulai, -2), "09:15"),
      namaDokumen: `${`SA-${mulai.getFullYear()}-${pad(mulai.getMonth() + 1)}`}.pdf`,
      catatan: p.status === "Draft" ? "Menunggu verifikasi dokumen SPBE." : undefined,
    };
  });
}

/**
 * Builds plans, their rows, and the deliveries that flow from confirmation.
 * Past days are finished, today is mid-run, the next two days are drafts.
 */
function seedOperations(
  pangkalan: PangkalanEntity[],
  drivers: DriverEntity[],
  sas: SAEntity[],
) {
  const today = startOfToday();
  const plans: PlanEntity[] = [];
  const planRows: PlanRowEntity[] = [];
  const deliveries: DeliveryEntity[] = [];

  const activeSa = sas.find((s) => s.status === "Aktif") ?? sas[2];
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  let planSeq = 0;
  let deliverySeq = 0;

  // Each branch runs its own day, so a plan and everything under it belong to
  // exactly one branch — the same shape as core.plans.branch_id.
  for (const branch of BRANCHES) {
  const scope = { tenantId: TENANT.id, branchId: branch.id };
  const aktifPangkalan = pangkalan.filter(
    (p) => p.status === "Aktif" && p.branchId === branch.id,
  );
  const aktifDrivers = drivers.filter(
    (d) => d.status !== "Cuti" && d.branchId === branch.id,
  );
  if (aktifPangkalan.length === 0 || aktifDrivers.length === 0) continue;

  for (let offset = -14; offset <= 2; offset++) {
    const date = addDays(today, offset);
    // Agency runs six days a week — no Sunday dispatch.
    if (date.getDay() === 0) continue;

    planSeq += 1;
    const planId = `plan-${String(planSeq).padStart(3, "0")}`;
    const status: PlanEntity["status"] =
      offset < 0 ? "Selesai" : offset === 0 ? "Terkonfirmasi" : "Draft";

    plans.push({
      ...scope,
      id: planId,
      kode: `RD-${isoDate(date).replace(/-/g, "")}`,
      tanggal: isoDate(date),
      saId: activeSa.id,
      status,
      dibuatOleh: "Alex Lawrence",
      dibuatPada: atTime(addDays(date, -1), "16:20"),
      dikonfirmasiOleh: status === "Draft" ? undefined : "Alex Lawrence",
      dikonfirmasiPada: status === "Draft" ? undefined : atTime(addDays(date, -1), "17:05"),
    });

    const stopCount = randInt(6, 9);
    const chosen = [...aktifPangkalan]
      .sort(() => rand() - 0.5)
      .slice(0, stopCount);

    // Three or four trucks share the day's stops, so each lane on the dispatch
    // rail reads as a route rather than a single drop.
    const crew = [...aktifDrivers]
      .sort(() => rand() - 0.5)
      .slice(0, randInt(3, 4));

    chosen.forEach((pkl, idx) => {
      const rowId = `row-${planId}-${idx + 1}`;
      const driver = crew[idx % crew.length];
      const slot = Math.floor(idx / crew.length);
      const jam = `${String(7 + slot * 3 + (idx % crew.length)).padStart(2, "0")}:${
        idx % 2 === 0 ? "00" : "30"
      }`;
      const target = randInt(6, 18) * 10;

      planRows.push({
        id: rowId,
        planId,
        pangkalanId: pkl.id,
        driverId: status === "Draft" && idx === stopCount - 1 ? null : driver.id,
        jumlahTabung: target,
        jamPengiriman: jam,
      });

      if (status === "Draft") return;

      deliverySeq += 1;
      const jamMinutes = Number(jam.slice(0, 2)) * 60 + Number(jam.slice(3));

      let dStatus: DeliveryEntity["status"];
      let realisasi: number;

      if (offset < 0) {
        const late = rand() > 0.92;
        dStatus = late ? "Tertunda" : "Selesai";
        realisasi = late ? 0 : target - (rand() > 0.7 ? randInt(0, 8) * 5 : 0);
      } else if (nowMinutes > jamMinutes + 90) {
        dStatus = "Selesai";
        realisasi = target - (rand() > 0.75 ? randInt(0, 6) * 5 : 0);
      } else if (nowMinutes > jamMinutes - 30) {
        dStatus = "Proses";
        realisasi = Math.round(target * (0.2 + rand() * 0.5));
      } else {
        dStatus = "Antrian";
        realisasi = 0;
      }

      deliveries.push({
        ...scope,
        id: `dlv-${String(deliverySeq).padStart(4, "0")}`,
        kode: `SJ-${isoDate(date).replace(/-/g, "")}-${String(idx + 1).padStart(2, "0")}`,
        planId,
        planRowId: rowId,
        pangkalanId: pkl.id,
        driverId: driver.id,
        tanggal: isoDate(date),
        jamRencana: jam,
        target,
        realisasi,
        status: dStatus,
        mulaiPada: dStatus === "Antrian" ? undefined : atTime(date, jam),
        selesaiPada:
          dStatus === "Selesai"
            ? atTime(date, `${String(Math.min(19, Number(jam.slice(0, 2)) + 1)).padStart(2, "0")}:15`)
            : undefined,
        driverLat: dStatus === "Proses" ? pkl.lat + (rand() - 0.5) * 0.03 : undefined,
        driverLng: dStatus === "Proses" ? pkl.lng + (rand() - 0.5) * 0.03 : undefined,
        catatan: dStatus === "Tertunda" ? "Pangkalan tutup saat armada tiba." : undefined,
      });
    });
  }

  }

  // Today's drivers reflect what they are actually doing right now.
  const todayIso = isoDate(today);
  for (const driver of drivers) {
    if (driver.status === "Cuti") continue;
    const mine = deliveries.filter(
      (d) => d.tanggal === todayIso && d.driverId === driver.id,
    );
    if (mine.some((d) => d.status === "Proses")) {
      driver.status = rand() > 0.5 ? "Dalam Perjalanan" : "Bongkar Muat";
    } else if (mine.length > 0 && mine.every((d) => d.status === "Selesai")) {
      driver.status = "Selesai";
    }
  }

  return { plans, planRows, deliveries };
}

/**
 * Builds the receivables ledger from completed deliveries.
 *
 * Deliberately messy: some invoices settled in full, some part-paid, some
 * overdue, a couple of credit notes. A clean ledger would make the aging report
 * look like decoration rather than a tool.
 */
function seedReceivables(
  deliveries: DeliveryEntity[],
  pangkalan: PangkalanEntity[],
  products: ProductEntity[],
  settings: SettingsEntity,
) {
  const invoices: InvoiceEntity[] = [];
  const payments: PaymentEntity[] = [];
  const creditNotes: CreditNoteEntity[] = [];
  const accounts = seedAccounts();
  const journals: JournalEntity[] = [];

  const acc = (role: string) => accounts.find((a) => a.role === role)!.id;
  const harga = settings.hargaPerTabung;
  const hargaBeli = products[0]?.hargaBeli ?? Math.round(harga * 0.85);
  const today = startOfToday();

  let jSeq = 0;
  const post = (
    tanggal: string,
    keterangan: string,
    sumber: JournalEntity["sumber"],
    lines: JournalEntity["lines"],
    scope: { tenantId: string; branchId: string } = {
      tenantId: TENANT.id,
      branchId: BRANCHES[0].id,
    },
  ) => {
    jSeq += 1;
    journals.push({
      ...scope,
      id: `jrn-${String(jSeq).padStart(4, "0")}`,
      nomor: `JV-${tanggal.replace(/-/g, "")}-${String(jSeq).padStart(4, "0")}`,
      tanggal,
      keterangan,
      sumber,
      lines,
      status: "Diposting",
      dibuatOleh: "Sistem",
      dibuatPada: new Date().toISOString(),
    });
  };

  const settled = deliveries
    .filter((d) => d.status === "Selesai" && d.realisasi > 0)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  settled.forEach((d, i) => {
    const pkl = pangkalan.find((p) => p.id === d.pangkalanId);
    // Everything raised from a delivery lives in that delivery's branch.
    const scope = { tenantId: d.tenantId, branchId: d.branchId };
    const subtotal = d.realisasi * harga;
    const jatuhTempo = isoDate(addDays(new Date(d.tanggal), pkl?.termin ?? 7));

    const inv: InvoiceEntity = {
      ...scope,
      id: `inv-${String(i + 1).padStart(4, "0")}`,
      nomor: `INV-${d.tanggal.replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
      pangkalanId: d.pangkalanId,
      deliveryId: d.id,
      tanggal: d.tanggal,
      jatuhTempo,
      jumlahTabung: d.realisasi,
      hargaSatuan: harga,
      subtotal,
      pajak: 0,
      total: subtotal,
      terbayar: 0,
      kredit: 0,
      status: "Terbit",
      catatan: `Tagihan otomatis dari ${d.kode}.`,
      dibuatOleh: "Sistem",
    };
    invoices.push(inv);

    const hpp = d.realisasi * hargaBeli;
    post(inv.tanggal, `${inv.nomor} — penjualan ke ${pkl?.nama ?? "pangkalan"}`,
      { tipe: "invoice", id: inv.id },
      [
        { akunId: acc("piutang"), debit: inv.total, kredit: 0 },
        { akunId: acc("pendapatan"), debit: 0, kredit: inv.subtotal },
        { akunId: acc("hpp"), debit: hpp, kredit: 0 },
        { akunId: acc("persediaan"), debit: 0, kredit: hpp },
      ], scope);

    // Older invoices are mostly settled; recent ones are still open.
    const umur = Math.round((today.getTime() - new Date(d.tanggal).getTime()) / 86_400_000);
    const roll = rand();
    let bayar = 0;
    if (umur > 9) bayar = roll > 0.12 ? inv.total : inv.total * 0.4;
    else if (umur > 4) bayar = roll > 0.45 ? inv.total : roll > 0.2 ? inv.total * 0.5 : 0;
    else bayar = roll > 0.75 ? inv.total : 0;
    bayar = Math.round(bayar);

    if (bayar > 0) {
      const tanggalBayar = isoDate(addDays(new Date(d.tanggal), randInt(1, Math.max(2, (pkl?.termin ?? 7) + 3))));
      const p: PaymentEntity = {
        ...scope,
        id: `pay-${String(payments.length + 1).padStart(4, "0")}`,
        nomor: `BKM-${tanggalBayar.replace(/-/g, "")}-${String(payments.length + 1).padStart(3, "0")}`,
        pangkalanId: d.pangkalanId,
        tanggal: tanggalBayar,
        jumlah: bayar,
        bank: pick(BANKS),
        noRekening: `${randInt(1000, 9999)}-${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
        status: umur > 2 ? "Terverifikasi" : "Menunggu Verifikasi",
        alokasi: [{ invoiceId: inv.id, jumlah: bayar }],
        buktiTransfer: `bukti-${pkl?.kode ?? "PKL"}-${payments.length + 1}.jpg`,
        keterangan: rand() > 0.7 ? "Transfer via mobile banking." : undefined,
        diverifikasiOleh: umur > 2 ? "Alex Lawrence" : undefined,
        diverifikasiPada: umur > 2 ? atTime(new Date(tanggalBayar), "16:40") : undefined,
      };
      payments.push(p);

      // Only verified cash reduces the receivable and reaches the ledger, so
      // the AR sub-ledger reconciles to the control account.
      if (p.status === "Terverifikasi") {
        inv.terbayar = bayar;
        post(p.tanggal, `${p.nomor} — penerimaan dari ${pkl?.nama ?? "pangkalan"}`,
          { tipe: "payment", id: p.id },
          [
            { akunId: acc("bank"), debit: bayar, kredit: 0 },
            { akunId: acc("piutang"), debit: 0, kredit: bayar },
          ], scope);
      }
    }

    // A couple of returns, so the credit-note path has history.
    if (rand() > 0.94 && inv.total - inv.terbayar > harga * 5) {
      const jumlah = Math.round(harga * randInt(2, 5));
      const note: CreditNoteEntity = {
        ...scope,
        id: `cn-${String(creditNotes.length + 1).padStart(3, "0")}`,
        nomor: `NK-${d.tanggal.replace(/-/g, "")}-${String(creditNotes.length + 1).padStart(3, "0")}`,
        pangkalanId: d.pangkalanId,
        invoiceId: inv.id,
        tanggal: isoDate(addDays(new Date(d.tanggal), 1)),
        jumlah,
        alasan: pick([
          "Tabung dikembalikan karena segel rusak.",
          "Koreksi jumlah pada surat jalan.",
          "Potongan atas keterlambatan pengiriman.",
        ]),
        status: "Terpakai",
        dibuatOleh: "Alex Lawrence",
      };
      creditNotes.push(note);
      inv.kredit = jumlah;
      post(note.tanggal, `${note.nomor} — ${note.alasan}`,
        { tipe: "creditNote", id: note.id },
        [
          { akunId: acc("returPenjualan"), debit: jumlah, kredit: 0 },
          { akunId: acc("piutang"), debit: 0, kredit: jumlah },
        ], scope);
    }

    const sisa = inv.total - inv.terbayar - inv.kredit;
    const todayIso = isoDate(today);
    if (sisa <= 0) inv.status = "Lunas";
    else if (inv.jatuhTempo < todayIso) inv.status = "Jatuh Tempo";
    else if (inv.terbayar > 0 || inv.kredit > 0) inv.status = "Sebagian";
    else inv.status = "Terbit";
  });

  // Opening equity, so the balance sheet does not start lopsided.
  const modal = 250_000_000;
  post(isoDate(addDays(today, -400)), "Setoran modal awal", { tipe: "manual", id: "opening" }, [
    { akunId: acc("bank"), debit: modal * 0.4, kredit: 0 },
    { akunId: acc("persediaan"), debit: modal * 0.6, kredit: 0 },
    { akunId: accounts.find((a) => a.kode === "3-1000")!.id, debit: 0, kredit: modal },
  ]);

  return { invoices, payments, creditNotes, accounts, journals };
}

function seedReceipts(pangkalan: PangkalanEntity[]): ReceiptEntity[] {
  return Array.from({ length: 9 }, (_, i) => {
    const pkl = pangkalan[randInt(0, pangkalan.length - 1)];
    const jumlah = randInt(4, 16) * 10;
    const confident = rand();
    return {
      ...branchFor(i),
      id: `ocr-${String(i + 1).padStart(3, "0")}`,
      namaBerkas: `kwitansi-${isoDate(addDays(startOfToday(), -randInt(0, 5)))}-${i + 1}.jpg`,
      pangkalanId: confident > 0.25 ? pkl.id : null,
      nomorKwitansi: `KW/${randInt(1000, 9999)}/${new Date().getFullYear()}`,
      tanggalKwitansi: isoDate(addDays(startOfToday(), -randInt(0, 5))),
      jumlahTabung: jumlah,
      nominal: jumlah * HARGA_PER_TABUNG,
      bank: confident > 0.3 ? pick(BANKS) : null,
      keyakinan: 0.55 + confident * 0.44,
      status: i < 5 ? "Menunggu Review" : rand() > 0.75 ? "Ditolak" : "Tervalidasi",
      diunggahPada: atTime(addDays(startOfToday(), -randInt(0, 3)), `${randInt(8, 16)}:20`),
    };
  });
}

function seedOrders(pangkalan: PangkalanEntity[]): OrderEntity[] {
  const aktif = pangkalan.filter((p) => p.status === "Aktif");
  return Array.from({ length: 22 }, (_, i) => {
    const pkl = aktif[randInt(0, aktif.length - 1)];
    const masuk = addDays(startOfToday(), -randInt(0, 9));
    const status: OrderEntity["status"] =
      i < 6
        ? "Baru"
        : i < 10
          ? "Disetujui"
          : i < 15
            ? "Dijadwalkan"
            : rand() > 0.85
              ? "Ditolak"
              : "Selesai";
    return {
      ...branchFor(i),
      id: `ord-${String(i + 1).padStart(3, "0")}`,
      kode: `PO-${isoDate(masuk).replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
      pangkalanId: pkl.id,
      jumlahTabung: randInt(4, 20) * 10,
      tanggalMasuk: atTime(masuk, `${randInt(7, 17)}:${pick(["05", "20", "41", "55"])}`),
      tanggalDiminta: isoDate(addDays(masuk, randInt(1, 4))),
      status,
      catatan:
        status === "Ditolak"
          ? "Melebihi kuota bulanan pangkalan."
          : rand() > 0.75
            ? "Mohon kirim pagi hari."
            : undefined,
      diprosesOleh: status === "Baru" ? undefined : "Alex Lawrence",
      diprosesPada: status === "Baru" ? undefined : atTime(masuk, "16:10"),
    };
  }).sort((a, b) => b.tanggalMasuk.localeCompare(a.tanggalMasuk));
}

function seedUsers(): UserEntity[] {
  const roles: UserEntity["role"][] = [
    "admin",
    "manager",
    "finance",
    "staff",
    "staff",
    "viewer",
    "finance",
    "staff",
  ];
  return roles.map((role, i) => ({
    id: `usr-${String(i + 1).padStart(3, "0")}`,
    nama: i === 0 ? "Alex Lawrence" : ORANG[(i * 5 + 2) % ORANG.length],
    email:
      i === 0
        ? "alex@sidistrib.id"
        : `${ORANG[(i * 5 + 2) % ORANG.length].toLowerCase().split(" ")[0]}${i}@sidistrib.id`,
    role,
    telepon: `08${randInt(11, 99)}${randInt(1000000, 9999999)}`,
    // Admin and manager see every branch; the rest are pinned to one.
    branchIds: i <= 1 ? [] : [BRANCHES[i % BRANCHES.length].id],
    scopeType: i <= 1 ? ("tenant" as const) : ("branch" as const),
    cabang: i <= 1 ? "Semua cabang" : BRANCHES[i % BRANCHES.length].nama,
    status: i === 6 ? "Nonaktif" : i === 7 ? "Diundang" : "Aktif",
    terakhirMasuk:
      i === 7 ? undefined : atTime(addDays(startOfToday(), -randInt(0, 9)), "08:32"),
    dibuatPada: isoDate(addDays(startOfToday(), -randInt(60, 800))),
  }));
}

function seedProducts(): ProductEntity[] {
  const catalog = [
    { nama: "LPG 3 kg Subsidi", ukuran: "3 kg", jual: 12_000, beli: 10_200 },
    { nama: "LPG 5,5 kg Bright Gas", ukuran: "5,5 kg", jual: 88_000, beli: 79_500 },
    { nama: "LPG 12 kg", ukuran: "12 kg", jual: 192_000, beli: 175_000 },
    { nama: "LPG 50 kg", ukuran: "50 kg", jual: 810_000, beli: 742_000 },
    { nama: "Segel Tabung", ukuran: "1 lusin", jual: 24_000, beli: 18_000 },
    { nama: "Selang Regulator SNI", ukuran: "1 set", jual: 95_000, beli: 71_000 },
  ];
  return catalog.map((c, i) => ({
    id: `prd-${String(i + 1).padStart(3, "0")}`,
    kode: `SKU-${String(i + 1).padStart(4, "0")}`,
    nama: c.nama,
    ukuran: c.ukuran,
    hargaJual: c.jual,
    hargaBeli: c.beli,
    stok: randInt(20, 900),
    stokMinimum: randInt(40, 120),
    aktif: i !== 5,
  }));
}

/** Defaults for every configurable block, also used when migrating old data. */
export const DEFAULT_NUMBERING: NumberingEntity = {
  suratJalan: "SJ",
  invoice: "INV",
  rencana: "RD",
  pesanan: "PO",
  sertakanTanggal: true,
};

export const DEFAULT_OPERATIONS: OperationsEntity = {
  // Six-day week: the agency does not dispatch on Sunday.
  hariKerja: [1, 2, 3, 4, 5, 6],
  durasiSinggahMenit: 90,
  leadTimeHari: 14,
};

export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  rules: {
    saExpiry: {
      aktif: true,
      ambang: 7,
      penerima: ["admin", "manager"],
      kanal: ["app"],
    },
    quotaLow: {
      aktif: true,
      ambang: 95,
      penerima: ["admin", "manager"],
      kanal: ["app"],
    },
    stockLow: {
      aktif: true,
      ambang: 100,
      penerima: ["admin", "staff"],
      kanal: ["app"],
    },
    paymentPending: {
      aktif: true,
      ambang: 2,
      penerima: ["finance", "admin"],
      kanal: ["app", "email"],
    },
    deliveryDelay: {
      aktif: false,
      ambang: 60,
      penerima: ["admin", "staff"],
      kanal: ["app", "whatsapp"],
    },
    planUnconfirmed: {
      aktif: true,
      ambang: 17,
      penerima: ["admin", "staff"],
      kanal: ["app"],
    },
    orderPending: {
      aktif: true,
      ambang: 5,
      penerima: ["manager", "staff"],
      kanal: ["app"],
    },
  },
  whatsapp: {
    aktif: true,
    nomorPengirim: "0811-9000-142",
    templatePengingat:
      "Halo {pangkalan}, pengiriman {jumlah} tabung dijadwalkan {tanggal} pukul {jam}. Mohon siapkan penerimaan.",
  },
  email: { aktif: true, pengirim: "ops@sidistrib.id" },
};

function seedSpbe(): SpbeEntity[] {
  return SPBE.map((nama, i) => ({
    id: `spbe-${String(i + 1).padStart(3, "0")}`,
    kode: `SPBE-${String(i + 1).padStart(3, "0")}`,
    nama,
    alamat: `Jl. ${pick(["Industri Raya", "Bypass", "Cikarang Utama", "Raya Tambun"])} No. ${randInt(1, 90)}`,
    penanggungJawab: ORANG[(i * 7 + 3) % ORANG.length],
    telepon: `021-${randInt(700, 899)}-${randInt(1000, 9999)}`,
    aktif: true,
  }));
}

function seedBankAccounts(): BankAccountEntity[] {
  const rows: Array<[BankNameEntity, string]> = [
    ["BCA", "Bekasi Timur"],
    ["Mandiri", "Bekasi Cyber Park"],
    ["BRI", "Tambun"],
  ];
  return rows.map(([bank, cabang], i) => ({
    id: `bank-${String(i + 1).padStart(3, "0")}`,
    bank,
    nomorRekening: `${randInt(100, 999)}-${randInt(100000, 999999)}-${randInt(10, 99)}`,
    atasNama: "PT Sinar Distribusi Nusantara",
    cabang,
    utama: i === 0,
    aktif: true,
  }));
}

function seedSettings(): SettingsEntity {
  return {
    namaPerusahaan: "PT Sinar Distribusi Nusantara",
    nomorAgen: "AG-3275-0142",
    alamat: "Jl. Raya Industri No. 42, Bekasi Selatan, Kota Bekasi 17147",
    telepon: "021-8899-4210",
    email: "ops@sidistrib.id",
    zonaWaktu: "Asia/Jakarta",
    jamOperasionalMulai: "06:00",
    jamOperasionalSelesai: "18:00",
    hargaPerTabung: HARGA_PER_TABUNG,
    targetHarian: 1400,
    notifikasi: structuredClone(DEFAULT_NOTIFICATIONS),
    penomoran: { ...DEFAULT_NUMBERING },
    operasi: { ...DEFAULT_OPERATIONS },
    tema: "sistem",
  };
}

function seedNotifications(
  sas: SAEntity[],
  payments: PaymentEntity[],
  deliveries: DeliveryEntity[],
  products: ProductEntity[],
  settings: SettingsEntity,
): NotificationEntity[] {
  const out: NotificationEntity[] = [];
  // Seeded alerts obey the same switches as live ones, so a rule that starts
  // switched off does not arrive with history behind it.
  const push = (n: Omit<NotificationEntity, "id">) => {
    if (n.rule && !settings.notifikasi.rules[n.rule]?.aktif) return;
    out.push({ id: `ntf-${String(out.length + 1).padStart(3, "0")}`, ...n });
  };

  const limitSa = sas.find((s) => s.status === "Limit");
  if (limitSa) {
    push({
      type: "Alert",
      title: "Kuota SA hampir habis",
      message: `${limitSa.nomorSA} tersisa ${(limitSa.totalKuota - limitSa.terpakai).toLocaleString("id-ID")} tabung. Rencanakan ulang distribusi sebelum periode berakhir.`,
      createdAt: atTime(startOfToday(), "07:10"),
      isRead: false,
      href: "/sa",
      rule: "quotaLow",
    });
  }

  const pending = payments.filter((p) => p.status === "Menunggu Verifikasi");
  if (pending.length > 0) {
    push({
      type: "Pengingat",
      title: `${pending.length} pembayaran menunggu verifikasi`,
      message: `Total ${pending.reduce((s, p) => s + p.jumlah, 0).toLocaleString("id-ID")} rupiah belum diverifikasi tim keuangan.`,
      createdAt: atTime(startOfToday(), "08:00"),
      isRead: false,
      href: "/payments",
      rule: "paymentPending",
    });
  }

  const tertunda = deliveries.filter(
    (d) => d.tanggal === isoDate(startOfToday()) && d.status === "Tertunda",
  );
  if (tertunda.length > 0) {
    push({
      type: "Alert",
      title: "Pengiriman tertunda",
      message: `${tertunda.length} surat jalan hari ini belum dapat diselesaikan armada.`,
      createdAt: atTime(startOfToday(), "11:20"),
      isRead: false,
      href: "/monitoring",
      rule: "deliveryDelay",
    });
  }

  const lowStock = products.filter((p) => p.aktif && p.stok < p.stokMinimum);
  if (lowStock.length > 0) {
    push({
      type: "Alert",
      title: "Stok di bawah minimum",
      message: `${lowStock.map((p) => p.nama).join(", ")} berada di bawah ambang batas stok.`,
      createdAt: atTime(addDays(startOfToday(), -1), "16:45"),
      isRead: false,
      href: "/products",
      rule: "stockLow",
    });
  }

  push({
    type: "Sistem",
    title: "Sinkronisasi SPBE selesai",
    message: "Data realisasi dari SPBE mitra berhasil disinkronkan pagi ini.",
    createdAt: atTime(startOfToday(), "06:05"),
    isRead: true,
    href: "/sa",
  });

  push({
    type: "Pengingat",
    title: "Rencana besok belum dikonfirmasi",
    message: "Rencana distribusi untuk besok masih berstatus draf. Konfirmasi sebelum pukul 17.00.",
    createdAt: atTime(startOfToday(), "13:30"),
    isRead: false,
    href: "/distribution",
      rule: "planUnconfirmed",
  });

  push({
    type: "Sistem",
    title: "Laporan bulan lalu siap diunduh",
    message: "Rekapitulasi distribusi dan keuangan periode sebelumnya telah selesai diproses.",
    createdAt: atTime(addDays(startOfToday(), -2), "07:00"),
    isRead: true,
    href: "/reports",
  });

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ── entry point ───────────────────────────────────────────────────────── */

export function createSeedDatabase(): Database {
  const pangkalan = seedPangkalan();
  const drivers = seedDrivers();
  const scheduleAgreements = seedScheduleAgreements();
  const { plans, planRows, deliveries } = seedOperations(
    pangkalan,
    drivers,
    scheduleAgreements,
  );
  const products = seedProducts();
  const settings = seedSettings();
  const { invoices, payments, creditNotes, accounts, journals } = seedReceivables(
    deliveries,
    pangkalan,
    products,
    settings,
  );
  const receipts = seedReceipts(pangkalan);
  const notifications = seedNotifications(
    scheduleAgreements,
    payments,
    deliveries,
    products,
    settings,
  );

  return {
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
    tenant: TENANT,
    branches: BRANCHES,
    pangkalan,
    drivers,
    scheduleAgreements,
    plans,
    planRows,
    deliveries,
    payments,
    receipts,
    notifications,
    audit: [],
    users: seedUsers(),
    products,
    orders: seedOrders(pangkalan),
    spbe: seedSpbe(),
    bankAccounts: seedBankAccounts(),
    accounts,
    journals,
    invoices,
    creditNotes,
    settings,
  };
}
