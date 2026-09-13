import { crewedArmada } from "@/mocks/fleet";
import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { exportCsv, exportExcel, timestampSuffix, type ExcelColumn } from "@/lib/export";
import { productOf } from "@/mocks/lines";
import { outletLabelTitle, unitLabel } from "@/lib/lexicon";
import type {
  TransactionFilterOptions,
  TransactionFilters,
  TransactionRow,
  TransactionsApi,
  TransactionSummary,
} from "./contract";

function buildRows(): TransactionRow[] {
  const db = scopedDb();

  const outletById = new Map(db.outlets.map((p) => [p.id, p]));
  const driverById = new Map(db.drivers.map((d) => [d.id, d]));
  const planById = new Map(db.plans.map((p) => [p.id, p]));
  const saById = new Map(db.scheduleAgreements.map((s) => [s.id, s]));
  // The ledger row is the delivery joined to the invoice raised against it.
  const invoiceByDelivery = new Map(
    db.invoices.filter((i) => i.deliveryId).map((i) => [i.deliveryId!, i]),
  );

  // The date an invoice was actually paid, not the date it fell due. Money
  // only counts once a receipt is verified (the ledger itself posts on
  // verification, not on receipt), so this is diverifikasiPada, the latest
  // one when several receipts settled the same invoice.
  const paidOnByInvoice = new Map<string, string>();
  for (const p of db.payments) {
    if (p.status !== "Terverifikasi" || !p.diverifikasiPada) continue;
    for (const a of p.alokasi) {
      const current = paidOnByInvoice.get(a.invoiceId);
      if (!current || p.diverifikasiPada > current) {
        paidOnByInvoice.set(a.invoiceId, p.diverifikasiPada);
      }
    }
  }

  const fromDeliveries: TransactionRow[] = db.deliveries.map((d) => {
    const pkl = outletById.get(d.outletId);
    const drv = driverById.get(d.driverId);
    const plan = planById.get(d.planId);
    const sa = plan ? saById.get(plan.saId) : undefined;
    const inv = invoiceByDelivery.get(d.id);

    return {
      id: d.id,
      tanggal: d.tanggal,
      suratJalan: d.kode,
      invoice: inv?.nomor ?? "—",
      rencana: plan?.kode ?? "—",
      nomorSA: sa?.nomorSA ?? "—",
      outletId: d.outletId,
      outlet: pkl?.nama ?? "—",
      kodeOutlet: pkl?.kode ?? "—",
      kecamatan: pkl?.kecamatan ?? "—",
      driverId: d.driverId,
      driver: drv?.nama ?? "—",
      plat: drv ? crewedArmada(db, drv).plat : "—",
      jamRencana: d.jamRencana,
      target: d.target,
      realisasi: d.realisasi,
      selisih: d.realisasi - d.target,
      // No invoice yet: value what is on the truck at catalogue prices, so an
      // open drop still shows a plausible figure instead of nothing.
      nominal:
        inv?.total ??
        d.lines.reduce(
          (sum, l) =>
            sum + l.realisasi * (productOf(db.products, l.productId)?.hargaJual ?? 0),
          0,
        ),
      bank: "—",
      noRekening: "—",
      statusKirim: d.status,
      statusBayar: inv?.status ?? "Belum ditagih",
      diverifikasiOleh: inv?.dibuatOleh ?? "—",
      tanggalBayar: (inv && paidOnByInvoice.get(inv.id)) ?? "",
      keterangan: inv?.catatan ?? d.catatan ?? "",
    };
  });

  // Receipts validated through OCR raise an invoice with no surat jalan behind
  // it. They are still money received, so the ledger has to carry them.
  const standalone: TransactionRow[] = db.invoices
    .filter((i) => !i.deliveryId)
    .map((p) => {
      const pkl = outletById.get(p.outletId);
      return {
        id: p.id,
        tanggal: p.tanggal,
        suratJalan: "—",
        invoice: p.nomor,
        rencana: "—",
        nomorSA: "—",
        outletId: p.outletId,
        outlet: pkl?.nama ?? "—",
        kodeOutlet: pkl?.kode ?? "—",
        kecamatan: pkl?.kecamatan ?? "—",
        driverId: "",
        driver: "—",
        plat: "—",
        jamRencana: "—",
        target: 0,
        realisasi: p.jumlahUnit,
        selisih: 0,
        nominal: p.total,
        bank: "—",
        noRekening: "—",
        statusKirim: "—" as const,
        statusBayar: p.status,
        diverifikasiOleh: p.dibuatOleh,
        tanggalBayar: paidOnByInvoice.get(p.id) ?? "",
        keterangan: p.catatan ?? "",
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
    if (f?.outletId && f.outletId !== "Semua" && r.outletId !== f.outletId)
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
        r.outlet.toLowerCase().includes(q) ||
        r.kodeOutlet.toLowerCase().includes(q) ||
        r.driver.toLowerCase().includes(q) ||
        r.plat.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

async function getTransactions(filters?: TransactionFilters): Promise<TransactionRow[]> {
  await latency("read");
  return applyFilters(buildRows(), filters);
}

async function getTransactionSummary(
  filters?: TransactionFilters,
): Promise<TransactionSummary> {
  await latency("read");
  const rows = applyFilters(buildRows(), filters);
  const sumWhere = (status: string) =>
    rows.filter((r) => r.statusBayar === status).reduce((s, r) => s + r.nominal, 0);

  return {
    jumlah: rows.length,
    unit: rows.reduce((s, r) => s + r.realisasi, 0),
    nilai: rows.reduce((s, r) => s + r.nominal, 0),
    terverifikasi: sumWhere("Lunas"),
    menunggu: sumWhere("Terbit") + sumWhere("Sebagian"),
    ditolak: sumWhere("Jatuh Tempo"),
    belumDitagih: sumWhere("Belum ditagih"),
    outlet: new Set(rows.map((r) => r.outletId)).size,
  };
}

/** Options for the filter bar, taken from the data actually present. */
async function getTransactionFilterOptions(): Promise<TransactionFilterOptions> {
  await latency("read");
  const db = scopedDb();
  return {
    outlet: db.outlets
      .map((p) => ({ id: p.id, label: p.nama }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    kecamatan: [...new Set(db.outlets.map((p) => p.kecamatan))].sort(),
    drivers: db.drivers
      .map((d) => ({ id: d.id, label: `${d.nama} — ${crewedArmada(db, d).plat}` }))
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
  { header: `Kode ${outletLabelTitle()}`, value: (r) => r.kodeOutlet, width: 14 },
  { header: outletLabelTitle(), value: (r) => r.outlet, width: 26 },
  { header: "Kecamatan", value: (r) => r.kecamatan, width: 16 },
  { header: "Driver", value: (r) => r.driver, width: 18 },
  { header: "Plat", value: (r) => r.plat, width: 12 },
  { header: `Target (${unitLabel()})`, value: (r) => r.target, type: "number", width: 13 },
  { header: `Realisasi (${unitLabel()})`, value: (r) => r.realisasi, type: "number", width: 15 },
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

async function exportTransactionsExcel(filters?: TransactionFilters): Promise<number> {
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

async function exportTransactionsCsv(filters?: TransactionFilters): Promise<number> {
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

export const transactionApiMock: TransactionsApi = {
  getTransactions,
  getTransactionSummary,
  getTransactionFilterOptions,
  exportTransactionsExcel,
  exportTransactionsCsv,
};
