import { getDb, latency } from "@/mocks/db";
import { isoDate, startOfToday } from "@/mocks/seed";
import { exportCsv, exportExcel, timestampSuffix, type ExcelColumn } from "@/lib/export";
import type { DeliveryStatus, PaymentStatusEntity } from "@/mocks/types";

/**
 * One line of the finance ledger.
 *
 * A transaction is a delivery and the invoice raised against it, flattened into
 * a single row — that is the grain finance actually reconciles against. Scanned
 * receipts that never had a surat jalan appear too, so the ledger is complete.
 */
export interface TransactionRow {
  id: string;
  tanggal: string;
  suratJalan: string;
  invoice: string;
  rencana: string;
  nomorSA: string;
  pangkalanId: string;
  pangkalan: string;
  kodePangkalan: string;
  kecamatan: string;
  driverId: string;
  driver: string;
  plat: string;
  jamRencana: string;
  target: number;
  realisasi: number;
  selisih: number;
  nominal: number;
  bank: string;
  noRekening: string;
  statusKirim: DeliveryStatus | "—";
  statusBayar: PaymentStatusEntity | "Belum ditagih";
  diverifikasiOleh: string;
  tanggalBayar: string;
  keterangan: string;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  search?: string;
  pangkalanId?: string;
  kecamatan?: string;
  driverId?: string;
  statusKirim?: string;
  statusBayar?: string;
}

export interface TransactionSummary {
  jumlah: number;
  tabung: number;
  nilai: number;
  terverifikasi: number;
  menunggu: number;
  ditolak: number;
  belumDitagih: number;
  pangkalan: number;
}

/** Default window: the current calendar month. */
export function defaultRange() {
  const today = startOfToday();
  return {
    from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    to: isoDate(today),
  };
}

function buildRows(): TransactionRow[] {
  const db = getDb();
  const harga = db.settings.hargaPerTabung;

  const pangkalanById = new Map(db.pangkalan.map((p) => [p.id, p]));
  const driverById = new Map(db.drivers.map((d) => [d.id, d]));
  const planById = new Map(db.plans.map((p) => [p.id, p]));
  const saById = new Map(db.scheduleAgreements.map((s) => [s.id, s]));
  const paymentByDelivery = new Map(
    db.payments.filter((p) => p.deliveryId).map((p) => [p.deliveryId!, p]),
  );

  const fromDeliveries: TransactionRow[] = db.deliveries.map((d) => {
    const pkl = pangkalanById.get(d.pangkalanId);
    const drv = driverById.get(d.driverId);
    const plan = planById.get(d.planId);
    const sa = plan ? saById.get(plan.saId) : undefined;
    const pay = paymentByDelivery.get(d.id);

    return {
      id: d.id,
      tanggal: d.tanggal,
      suratJalan: d.kode,
      invoice: pay?.kode ?? "—",
      rencana: plan?.kode ?? "—",
      nomorSA: sa?.nomorSA ?? "—",
      pangkalanId: d.pangkalanId,
      pangkalan: pkl?.nama ?? "—",
      kodePangkalan: pkl?.kode ?? "—",
      kecamatan: pkl?.kecamatan ?? "—",
      driverId: d.driverId,
      driver: drv?.nama ?? "—",
      plat: drv?.plat ?? "—",
      jamRencana: d.jamRencana,
      target: d.target,
      realisasi: d.realisasi,
      selisih: d.realisasi - d.target,
      nominal: pay?.nominal ?? d.realisasi * harga,
      bank: pay?.bank ?? "—",
      noRekening: pay?.noRekening ?? "—",
      statusKirim: d.status,
      statusBayar: pay?.status ?? "Belum ditagih",
      diverifikasiOleh: pay?.diverifikasiOleh ?? "—",
      tanggalBayar: pay?.tanggalBayar ?? "",
      keterangan: pay?.keterangan ?? d.catatan ?? "",
    };
  });

  // Receipts validated through OCR raise an invoice with no surat jalan behind
  // it. They are still money received, so the ledger has to carry them.
  const standalone: TransactionRow[] = db.payments
    .filter((p) => !p.deliveryId)
    .map((p) => {
      const pkl = pangkalanById.get(p.pangkalanId);
      return {
        id: p.id,
        tanggal: p.tanggalBayar.slice(0, 10),
        suratJalan: "—",
        invoice: p.kode,
        rencana: "—",
        nomorSA: "—",
        pangkalanId: p.pangkalanId,
        pangkalan: pkl?.nama ?? "—",
        kodePangkalan: pkl?.kode ?? "—",
        kecamatan: pkl?.kecamatan ?? "—",
        driverId: "",
        driver: "—",
        plat: "—",
        jamRencana: "—",
        target: 0,
        realisasi: p.jumlahTabung,
        selisih: 0,
        nominal: p.nominal,
        bank: p.bank,
        noRekening: p.noRekening,
        statusKirim: "—" as const,
        statusBayar: p.status,
        diverifikasiOleh: p.diverifikasiOleh ?? "—",
        tanggalBayar: p.tanggalBayar,
        keterangan: p.keterangan ?? "",
      };
    });

  return [...fromDeliveries, ...standalone].sort(
    (a, b) =>
      b.tanggal.localeCompare(a.tanggal) || a.jamRencana.localeCompare(b.jamRencana),
  );
}

function applyFilters(rows: TransactionRow[], f?: TransactionFilters) {
  return rows.filter((r) => {
    if (f?.from && r.tanggal < f.from) return false;
    if (f?.to && r.tanggal > f.to) return false;
    if (f?.pangkalanId && f.pangkalanId !== "Semua" && r.pangkalanId !== f.pangkalanId)
      return false;
    if (f?.kecamatan && f.kecamatan !== "Semua" && r.kecamatan !== f.kecamatan)
      return false;
    if (f?.driverId && f.driverId !== "Semua" && r.driverId !== f.driverId) return false;
    if (f?.statusKirim && f.statusKirim !== "Semua" && r.statusKirim !== f.statusKirim)
      return false;
    if (f?.statusBayar && f.statusBayar !== "Semua" && r.statusBayar !== f.statusBayar)
      return false;
    if (f?.search) {
      const q = f.search.toLowerCase();
      return (
        r.suratJalan.toLowerCase().includes(q) ||
        r.invoice.toLowerCase().includes(q) ||
        r.pangkalan.toLowerCase().includes(q) ||
        r.kodePangkalan.toLowerCase().includes(q) ||
        r.driver.toLowerCase().includes(q) ||
        r.plat.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export async function getTransactions(
  filters?: TransactionFilters,
): Promise<TransactionRow[]> {
  await latency("read");
  return applyFilters(buildRows(), filters);
}

export async function getTransactionSummary(
  filters?: TransactionFilters,
): Promise<TransactionSummary> {
  await latency("read");
  const rows = applyFilters(buildRows(), filters);
  const sumWhere = (status: string) =>
    rows.filter((r) => r.statusBayar === status).reduce((s, r) => s + r.nominal, 0);

  return {
    jumlah: rows.length,
    tabung: rows.reduce((s, r) => s + r.realisasi, 0),
    nilai: rows.reduce((s, r) => s + r.nominal, 0),
    terverifikasi: sumWhere("Terverifikasi"),
    menunggu: sumWhere("Menunggu Verifikasi"),
    ditolak: sumWhere("Ditolak"),
    belumDitagih: sumWhere("Belum ditagih"),
    pangkalan: new Set(rows.map((r) => r.pangkalanId)).size,
  };
}

/** Options for the filter bar, taken from the data actually present. */
export async function getTransactionFilterOptions() {
  await latency("read");
  const db = getDb();
  return {
    pangkalan: db.pangkalan
      .map((p) => ({ id: p.id, label: p.nama }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    kecamatan: [...new Set(db.pangkalan.map((p) => p.kecamatan))].sort(),
    drivers: db.drivers
      .map((d) => ({ id: d.id, label: `${d.nama} — ${d.plat}` }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

/** Column layout shared by both exports, so the files match the table. */
const EXPORT_COLUMNS: ExcelColumn<TransactionRow>[] = [
  { header: "Tanggal", value: (r) => new Date(r.tanggal), type: "date", width: 12 },
  { header: "Jam", value: (r) => r.jamRencana, width: 7 },
  { header: "Surat Jalan", value: (r) => r.suratJalan, width: 20 },
  { header: "Invoice", value: (r) => r.invoice, width: 20 },
  { header: "Rencana", value: (r) => r.rencana, width: 15 },
  { header: "Nomor SA", value: (r) => r.nomorSA, width: 16 },
  { header: "Kode Pangkalan", value: (r) => r.kodePangkalan, width: 14 },
  { header: "Pangkalan", value: (r) => r.pangkalan, width: 26 },
  { header: "Kecamatan", value: (r) => r.kecamatan, width: 16 },
  { header: "Driver", value: (r) => r.driver, width: 18 },
  { header: "Plat", value: (r) => r.plat, width: 12 },
  { header: "Target (tabung)", value: (r) => r.target, type: "number", width: 13 },
  { header: "Realisasi (tabung)", value: (r) => r.realisasi, type: "number", width: 15 },
  { header: "Selisih", value: (r) => r.selisih, type: "number", width: 10 },
  { header: "Nominal", value: (r) => r.nominal, type: "currency", width: 16 },
  { header: "Bank", value: (r) => r.bank, width: 10 },
  { header: "No. Rekening", value: (r) => r.noRekening, width: 18 },
  { header: "Status Pengiriman", value: (r) => r.statusKirim, width: 16 },
  { header: "Status Pembayaran", value: (r) => r.statusBayar, width: 18 },
  { header: "Diverifikasi Oleh", value: (r) => r.diverifikasiOleh, width: 18 },
  {
    header: "Tanggal Bayar",
    value: (r) => (r.tanggalBayar ? new Date(r.tanggalBayar) : null),
    type: "date",
    width: 14,
  },
  { header: "Keterangan", value: (r) => r.keterangan, width: 34 },
];

export async function exportTransactionsExcel(filters?: TransactionFilters) {
  await latency("read");
  const rows = applyFilters(buildRows(), filters);
  exportExcel(
    `rekap-transaksi-${timestampSuffix()}`,
    "Rekap Transaksi",
    EXPORT_COLUMNS,
    rows,
  );
  return rows.length;
}

export async function exportTransactionsCsv(filters?: TransactionFilters) {
  await latency("read");
  const rows = applyFilters(buildRows(), filters);
  exportCsv(
    `rekap-transaksi-${timestampSuffix()}`,
    EXPORT_COLUMNS.map((c) => c.header),
    rows.map((row) =>
      EXPORT_COLUMNS.map((c) => {
        const v = c.value(row);
        if (v instanceof Date) return v.toLocaleDateString("id-ID");
        return v ?? "";
      }),
    ),
  );
  return rows.length;
}
