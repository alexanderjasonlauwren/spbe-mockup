import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import {
  AGING_BUCKETS,
  agingBucket,
  invoiceSisa,
  outletExposure,
  unallocated,
} from "@/mocks/ar";
import {
  accountBalances,
  profitAndLoss,
  trialBalance,
  type AccountBalance,
} from "@/mocks/ledger";
import {
  allocatePayment,
  createCreditNote,
  createPayment,
  syncReceivables,
} from "@/mocks/rules";
import { isoDate, startOfToday } from "@/mocks/seed";
import { exportExcel, timestampSuffix, type ExcelColumn } from "@/lib/export";
import type { InvoiceStatus } from "@/mocks/types";
import { outletLabelTitle } from "@/lib/lexicon";

/* ── invoices ──────────────────────────────────────────────────────────── */

export interface InvoiceView {
  id: string;
  nomor: string;
  outletId: string;
  outlet: string;
  kecamatan: string;
  suratJalan: string;
  tanggal: string;
  jatuhTempo: string;
  /** Negative until due, positive once overdue. */
  umurHari: number;
  bucket: (typeof AGING_BUCKETS)[number];
  jumlahUnit: number;
  total: number;
  terbayar: number;
  kredit: number;
  sisa: number;
  status: InvoiceStatus;
  termin: number;
}

function toInvoiceView(id: string): InvoiceView | null {
  const db = scopedDb();
  const inv = db.invoices.find((i) => i.id === id);
  if (!inv) return null;
  const pkl = db.outlets.find((p) => p.id === inv.outletId);
  const delivery = db.deliveries.find((d) => d.id === inv.deliveryId);
  const today = isoDate(startOfToday());

  return {
    id: inv.id,
    nomor: inv.nomor,
    outletId: inv.outletId,
    outlet: pkl?.nama ?? "—",
    kecamatan: pkl?.kecamatan ?? "—",
    suratJalan: delivery?.kode ?? "—",
    tanggal: inv.tanggal,
    jatuhTempo: inv.jatuhTempo,
    umurHari: Math.floor(
      (new Date(today).getTime() - new Date(inv.jatuhTempo).getTime()) / 86_400_000,
    ),
    bucket: agingBucket(inv, today),
    jumlahUnit: inv.jumlahUnit,
    total: inv.total,
    terbayar: inv.terbayar,
    kredit: inv.kredit,
    sisa: invoiceSisa(inv),
    status: inv.status,
    termin: pkl?.termin ?? 0,
  };
}

export interface InvoiceFilters {
  status?: InvoiceStatus | "Semua" | "Belum lunas";
  outletId?: string;
  bucket?: string;
  search?: string;
}

export async function getInvoices(filters?: InvoiceFilters): Promise<InvoiceView[]> {
  await latency("read");
  syncReceivables();
  const db = scopedDb();

  return db.invoices
    .map((i) => toInvoiceView(i.id)!)
    .filter((inv) => {
      if (filters?.status === "Belum lunas") {
        if (inv.sisa <= 0 || inv.status === "Batal") return false;
      } else if (filters?.status && filters.status !== "Semua") {
        if (inv.status !== filters.status) return false;
      }
      if (filters?.outletId && filters.outletId !== "Semua") {
        if (inv.outletId !== filters.outletId) return false;
      }
      if (filters?.bucket && filters.bucket !== "Semua" && inv.bucket !== filters.bucket)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          inv.nomor.toLowerCase().includes(q) ||
          inv.outlet.toLowerCase().includes(q) ||
          inv.suratJalan.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

/* ── ageing ────────────────────────────────────────────────────────────── */

export interface AgingRow {
  outletId: string;
  outlet: string;
  termin: number;
  batasKredit: number;
  buckets: Record<string, number>;
  total: number;
  /** Overdue portion — the part that needs chasing. */
  jatuhTempo: number;
  terblokir: boolean;
}

export interface AgingReport {
  rows: AgingRow[];
  totals: Record<string, number>;
  grandTotal: number;
  jatuhTempoTotal: number;
  outletMenunggak: number;
  buckets: readonly string[];
}

export async function getAgingReport(): Promise<AgingReport> {
  await latency("read");
  syncReceivables();
  const db = scopedDb();
  const today = isoDate(startOfToday());

  const byOutlet = new Map<string, AgingRow>();
  const totals: Record<string, number> = Object.fromEntries(
    AGING_BUCKETS.map((b) => [b, 0]),
  );

  for (const inv of db.invoices) {
    const sisa = invoiceSisa(inv);
    if (inv.status === "Batal" || sisa <= 0) continue;

    const pkl = db.outlets.find((p) => p.id === inv.outletId);
    let row = byOutlet.get(inv.outletId);
    if (!row) {
      const exp = outletExposure(db, inv.outletId);
      row = {
        outletId: inv.outletId,
        outlet: pkl?.nama ?? "—",
        termin: pkl?.termin ?? 0,
        batasKredit: pkl?.batasKredit ?? 0,
        buckets: Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])),
        total: 0,
        jatuhTempo: 0,
        terblokir: exp.terblokir,
      };
      byOutlet.set(inv.outletId, row);
    }

    const bucket = agingBucket(inv, today);
    row.buckets[bucket] += sisa;
    row.total += sisa;
    if (bucket !== "Belum jatuh tempo") row.jatuhTempo += sisa;
    totals[bucket] += sisa;
  }

  const rows = [...byOutlet.values()].sort((a, b) => b.total - a.total);
  return {
    rows,
    totals,
    grandTotal: rows.reduce((s, r) => s + r.total, 0),
    jatuhTempoTotal: rows.reduce((s, r) => s + r.jatuhTempo, 0),
    outletMenunggak: rows.filter((r) => r.jatuhTempo > 0).length,
    buckets: AGING_BUCKETS,
  };
}

/** Everything owed by one outlet, for the statement of account. */
export async function getStatement(outletId: string) {
  await latency("read");
  syncReceivables();
  const db = scopedDb();
  const pkl = db.outlets.find((p) => p.id === outletId);
  const exposure = outletExposure(db, outletId);

  return {
    outlet: pkl,
    exposure,
    invoices: db.invoices
      .filter((i) => i.outletId === outletId)
      .map((i) => toInvoiceView(i.id)!)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    payments: db.payments
      .filter((p) => p.outletId === outletId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    creditNotes: db.creditNotes.filter((c) => c.outletId === outletId),
  };
}

/* ── cash receipts ─────────────────────────────────────────────────────── */

export interface PaymentView {
  id: string;
  nomor: string;
  outletId: string;
  outlet: string;
  tanggal: string;
  jumlah: number;
  belumDialokasikan: number;
  bank: string;
  noRekening: string;
  status: string;
  alokasi: { invoiceId: string; nomor: string; jumlah: number }[];
  buktiTransfer?: string;
  keterangan?: string;
  diverifikasiOleh?: string;
}

export async function getPayments(status?: string, search?: string): Promise<PaymentView[]> {
  await latency("read");
  const db = scopedDb();

  return db.payments
    .map((p) => {
      const pkl = db.outlets.find((x) => x.id === p.outletId);
      return {
        id: p.id,
        nomor: p.nomor,
        outletId: p.outletId,
        outlet: pkl?.nama ?? "—",
        tanggal: p.tanggal,
        jumlah: p.jumlah,
        belumDialokasikan: unallocated(p),
        bank: p.bank,
        noRekening: p.noRekening,
        status: p.status,
        alokasi: p.alokasi.map((a) => ({
          invoiceId: a.invoiceId,
          nomor: db.invoices.find((i) => i.id === a.invoiceId)?.nomor ?? "—",
          jumlah: a.jumlah,
        })),
        buktiTransfer: p.buktiTransfer,
        keterangan: p.keterangan,
        diverifikasiOleh: p.diverifikasiOleh,
      };
    })
    .filter((p) => {
      if (status && status !== "Semua" && p.status !== status) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.nomor.toLowerCase().includes(q) ||
          p.outlet.toLowerCase().includes(q) ||
          p.noRekening.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

/** Open invoices for the allocation picker. */
export async function getOpenInvoices(outletId: string): Promise<InvoiceView[]> {
  await latency("read");
  return scopedDb()
    .invoices.filter(
      (i) => i.outletId === outletId && i.status !== "Batal" && invoiceSisa(i) > 0,
    )
    .map((i) => toInvoiceView(i.id)!)
    .sort((a, b) => a.jatuhTempo.localeCompare(b.jatuhTempo));
}

export async function submitPayment(input: Parameters<typeof createPayment>[0]) {
  await latency("write");
  return createPayment(input);
}

export async function submitAllocation(
  paymentId: string,
  alokasi: { invoiceId: string; jumlah: number }[],
) {
  await latency("write");
  return allocatePayment(paymentId, alokasi);
}

export async function submitCreditNote(input: Parameters<typeof createCreditNote>[0]) {
  await latency("write");
  return createCreditNote(input);
}

/* ── general ledger ────────────────────────────────────────────────────── */

export async function getJournals(range?: { from?: string; to?: string }) {
  await latency("read");
  const db = scopedDb();
  const byId = new Map(db.accounts.map((a) => [a.id, a]));

  return db.journals
    .filter((j) => {
      if (range?.from && j.tanggal < range.from) return false;
      if (range?.to && j.tanggal > range.to) return false;
      return true;
    })
    .map((j) => ({
      ...j,
      total: j.lines.reduce((s, l) => s + l.debit, 0),
      lines: j.lines.map((l) => ({
        ...l,
        akun: byId.get(l.akunId),
      })),
    }));
}

export async function getTrialBalance(range: { from: string; to: string }) {
  await latency("read");
  return trialBalance(scopedDb(), range);
}

export async function getProfitAndLoss(range: { from: string; to: string }) {
  await latency("read");
  return profitAndLoss(scopedDb(), range);
}

export async function getChartOfAccounts(): Promise<AccountBalance[]> {
  await latency("read");
  return accountBalances(scopedDb());
}

/* ── exports ───────────────────────────────────────────────────────────── */

export async function exportAging() {
  await latency("read");
  const report = await getAgingReport();
  const columns: ExcelColumn<AgingRow>[] = [
    { header: outletLabelTitle(), value: (r) => r.outlet, width: 26 },
    { header: "Termin (hari)", value: (r) => r.termin, type: "number", width: 12 },
    { header: "Plafon", value: (r) => r.batasKredit, type: "currency", width: 16 },
    ...report.buckets.map((b) => ({
      header: b,
      value: (r: AgingRow) => r.buckets[b] ?? 0,
      type: "currency" as const,
      width: 16,
    })),
    { header: "Total piutang", value: (r) => r.total, type: "currency", width: 18 },
    { header: "Jatuh tempo", value: (r) => r.jatuhTempo, type: "currency", width: 18 },
    { header: "Diblokir", value: (r) => (r.terblokir ? "Ya" : "Tidak"), width: 10 },
  ];
  exportExcel(`umur-piutang-${timestampSuffix()}`, "Umur Piutang", columns, report.rows);
  return report.rows.length;
}
