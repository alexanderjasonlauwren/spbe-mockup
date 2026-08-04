/**
 * Deterministic seed data for the mock backend.
 *
 * Everything is generated relative to "today", so the console always opens on a
 * live-looking working day: finished runs behind it, a confirmed plan in
 * progress, drafts queued ahead.
 */

import type {
  Database,
  DeliveryEntity,
  DriverEntity,
  NotificationEntity,
  PangkalanEntity,
  PaymentEntity,
  PlanEntity,
  PlanRowEntity,
  OrderEntity,
  ProductEntity,
  ReceiptEntity,
  SAEntity,
  SettingsEntity,
  UserEntity,
} from "./types";

export const DB_VERSION = 1;

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

/** The agency yard. Routes start here and armada wait here between runs. */
export const DEPOT = { lat: -6.2607, lng: 106.9756, nama: "Pool Bekasi" };

/* ── generators ────────────────────────────────────────────────────────── */

function seedPangkalan(): PangkalanEntity[] {
  return PANGKALAN_NAMA.map((nama, i) => {
    const kecamatan = KECAMATAN[i % KECAMATAN.length];
    const statusRoll = rand();
    return {
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
      terdaftarPada: isoDate(addDays(startOfToday(), -randInt(120, 900))),
    };
  });
}

function seedDrivers(): DriverEntity[] {
  return Array.from({ length: 8 }, (_, i) => {
    const unit = ARMADA[i % ARMADA.length];
    return {
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
  const aktifPangkalan = pangkalan.filter((p) => p.status === "Aktif");
  const aktifDrivers = drivers.filter((d) => d.status !== "Cuti");
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  let planSeq = 0;
  let deliverySeq = 0;

  for (let offset = -14; offset <= 2; offset++) {
    const date = addDays(today, offset);
    // Agency runs six days a week — no Sunday dispatch.
    if (date.getDay() === 0) continue;

    planSeq += 1;
    const planId = `plan-${String(planSeq).padStart(3, "0")}`;
    const status: PlanEntity["status"] =
      offset < 0 ? "Selesai" : offset === 0 ? "Terkonfirmasi" : "Draft";

    plans.push({
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

function seedPayments(
  deliveries: DeliveryEntity[],
  pangkalan: PangkalanEntity[],
): PaymentEntity[] {
  const settled = deliveries.filter((d) => d.status === "Selesai");
  return settled.slice(-28).map((d, i) => {
    const roll = rand();
    const status: PaymentEntity["status"] =
      i >= settled.slice(-28).length - 6
        ? "Menunggu Verifikasi"
        : roll > 0.9
          ? "Ditolak"
          : "Terverifikasi";
    const pkl = pangkalan.find((p) => p.id === d.pangkalanId);
    return {
      id: `pay-${String(i + 1).padStart(4, "0")}`,
      kode: `INV-${d.tanggal.replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
      pangkalanId: d.pangkalanId,
      deliveryId: d.id,
      jumlahTabung: d.realisasi,
      nominal: d.realisasi * HARGA_PER_TABUNG,
      bank: pick(BANKS),
      noRekening: `${randInt(1000, 9999)}-${randInt(1000, 9999)}-${randInt(1000, 9999)}`,
      tanggalBayar: atTime(new Date(d.tanggal), `${randInt(8, 16)}:${pick(["05", "18", "32", "47"])}`),
      status,
      keterangan:
        status === "Ditolak"
          ? "Nominal transfer tidak sesuai surat jalan."
          : rand() > 0.6
            ? "Transfer via mobile banking."
            : undefined,
      diverifikasiOleh: status === "Menunggu Verifikasi" ? undefined : "Alex Lawrence",
      diverifikasiPada:
        status === "Menunggu Verifikasi"
          ? undefined
          : atTime(new Date(d.tanggal), "17:40"),
      buktiTransfer: `bukti-${pkl?.kode ?? "PKL"}-${i + 1}.jpg`,
    };
  });
}

function seedReceipts(pangkalan: PangkalanEntity[]): ReceiptEntity[] {
  return Array.from({ length: 9 }, (_, i) => {
    const pkl = pangkalan[randInt(0, pangkalan.length - 1)];
    const jumlah = randInt(4, 16) * 10;
    const confident = rand();
    return {
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
    cabang: pick(["Bekasi Pusat", "Tambun", "Cikarang"]),
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
    reminder: {
      saExpiry: true,
      stockLow: true,
      paymentPending: true,
      deliveryDelay: false,
      stockThresholdPct: 20,
    },
    whatsapp: {
      aktif: true,
      nomorPengirim: "0811-9000-142",
      templatePengingat:
        "Halo {pangkalan}, pengiriman {jumlah} tabung dijadwalkan {tanggal} pukul {jam}. Mohon siapkan penerimaan.",
    },
    tema: "sistem",
  };
}

function seedNotifications(
  sas: SAEntity[],
  payments: PaymentEntity[],
  deliveries: DeliveryEntity[],
  products: ProductEntity[],
): NotificationEntity[] {
  const out: NotificationEntity[] = [];
  const push = (n: Omit<NotificationEntity, "id">) =>
    out.push({ id: `ntf-${String(out.length + 1).padStart(3, "0")}`, ...n });

  const limitSa = sas.find((s) => s.status === "Limit");
  if (limitSa) {
    push({
      type: "Alert",
      title: "Kuota SA hampir habis",
      message: `${limitSa.nomorSA} tersisa ${(limitSa.totalKuota - limitSa.terpakai).toLocaleString("id-ID")} tabung. Rencanakan ulang distribusi sebelum periode berakhir.`,
      createdAt: atTime(startOfToday(), "07:10"),
      isRead: false,
      href: "/sa",
    });
  }

  const pending = payments.filter((p) => p.status === "Menunggu Verifikasi");
  if (pending.length > 0) {
    push({
      type: "Pengingat",
      title: `${pending.length} pembayaran menunggu verifikasi`,
      message: `Total ${pending.reduce((s, p) => s + p.nominal, 0).toLocaleString("id-ID")} rupiah belum diverifikasi tim keuangan.`,
      createdAt: atTime(startOfToday(), "08:00"),
      isRead: false,
      href: "/payments",
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
  const payments = seedPayments(deliveries, pangkalan);
  const receipts = seedReceipts(pangkalan);
  const products = seedProducts();
  const notifications = seedNotifications(
    scheduleAgreements,
    payments,
    deliveries,
    products,
  );

  return {
    version: DB_VERSION,
    seededAt: new Date().toISOString(),
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
    settings: seedSettings(),
  };
}
