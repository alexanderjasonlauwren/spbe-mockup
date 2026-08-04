import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import {
  AGING_BUCKETS,
  agingBucket,
  invoiceSisa,
  pangkalanExposure,
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

/* ── invoices ──────────────────────────────────────────────────────────── */

export interface InvoiceView {
  id: string;
  nomor: string;
  pangkalanId: string;
  pangkalan: string;
  kecamatan: string;
  suratJalan: string;
  tanggal: string;
  jatuhTempo: string;
  /** Negative until due, positive once overdue. */
  umurHari: number;
  bucket: (typeof AGING_BUCKETS)[number];
  jumlahTabung: number;
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
  const pkl = db.pangkalan.find((p) => p.id === inv.pangkalanId);
  const delivery = db.deliveries.find((d) => d.id === inv.deliveryId);
  const today = isoDate(startOfToday());

  return {
    id: inv.id,
    nomor: inv.nomor,
    pangkalanId: inv.pangkalanId,
    pangkalan: pkl?.nama ?? "—",
    kecamatan: pkl?.kecamatan ?? "—",
    suratJalan: delivery?.kode ?? "—",
    tanggal: inv.tanggal,
    jatuhTempo: inv.jatuhTempo,
    umurHari: Math.floor(
      (new Date(today).getTime() - new Date(inv.jatuhTempo).getTime()) / 86_400_000,
    ),
    bucket: agingBucket(inv, today),
    jumlahTabung: inv.jumlahTabung,
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
  pangkalanId?: string;
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
      if (filters?.pangkalanId && filters.pangkalanId !== "Semua") {
        if (inv.pangkalanId !== filters.pangkalanId) return false;
      }
      if (filters?.bucket && filters.bucket !== "Semua" && inv.bucket !== filters.bucket)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          inv.nomor.toLowerCase().includes(q) ||
          inv.pangkalan.toLowerCase().includes(q) ||
          inv.suratJalan.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

/* ── ageing ────────────────────────────────────────────────────────────── */

export interface AgingRow {
  pangkalanId: string;
  pangkalan: string;
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
  pangkalanMenunggak: number;
  buckets: readonly string[];
}

export async function getAgingReport(): Promise<AgingReport> {
  await latency("read");
  syncReceivables();
  const db = scopedDb();
  const today = isoDate(startOfToday());

  const byPangkalan = new Map<string, AgingRow>();
  const totals: Record<string, number> = Object.fromEntries(
    AGING_BUCKETS.map((b) => [b, 0]),
  );

  for (const inv of db.invoices) {
    const sisa = invoiceSisa(inv);
    if (inv.status === "Batal" || sisa <= 0) continue;

    const pkl = db.pangkalan.find((p) => p.id === inv.pangkalanId);
    let row = byPangkalan.get(inv.pangkalanId);
    if (!row) {
      const exp = pangkalanExposure(db, inv.pangkalanId);
      row = {
        pangkalanId: inv.pangkalanId,
        pangkalan: pkl?.nama ?? "—",
        termin: pkl?.termin ?? 0,
        batasKredit: pkl?.batasKredit ?? 0,
        buckets: Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])),
        total: 0,
        jatuhTempo: 0,
        terblokir: exp.terblokir,
      };
      byPangkalan.set(inv.pangkalanId, row);
    }

    const bucket = agingBucket(inv, today);
    row.buckets[bucket] += sisa;
    row.total += sisa;
    if (bucket !== "Belum jatuh tempo") row.jatuhTempo += sisa;
    totals[bucket] += sisa;
  }

  const rows = [...byPangkalan.values()].sort((a, b) => b.total - a.total);
  return {
    rows,
    totals,
    grandTotal: rows.reduce((s, r) => s + r.total, 0),
    jatuhTempoTotal: rows.reduce((s, r) => s + r.jatuhTempo, 0),
    pangkalanMenunggak: rows.filter((r) => r.jatuhTempo > 0).length,
    buckets: AGING_BUCKETS,
  };
}

/** Everything owed by one outlet, for the statement of account. */
export async function getStatement(pangkalanId: string) {
  await latency("read");
  syncReceivables();
  const db = scopedDb();
  const pkl = db.pangkalan.find((p) => p.id === pangkalanId);
  const exposure = pangkalanExposure(db, pangkalanId);

  return {
    pangkalan: pkl,
    exposure,
    invoices: db.invoices
      .filter((i) => i.pangkalanId === pangkalanId)
      .map((i) => toInvoiceView(i.id)!)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    payments: db.payments
      .filter((p) => p.pangkalanId === pangkalanId)
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal)),
    creditNotes: db.creditNotes.filter((c) => c.pangkalanId === pangkalanId),
  };
}

/* ── cash receipts ─────────────────────────────────────────────────────── */

export interface PaymentView {
  id: string;
  nomor: string;
  pangkalanId: string;
  pangkalan: string;
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
      const pkl = db.pangkalan.find((x) => x.id === p.pangkalanId);
      return {
        id: p.id,
        nomor: p.nomor,
        pangkalanId: p.pangkalanId,
        pangkalan: pkl?.nama ?? "—",
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
          p.pangkalan.toLowerCase().includes(q) ||
          p.noRekening.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
}

/** Open invoices for the allocation picker. */
export async function getOpenInvoices(pangkalanId: string): Promise<InvoiceView[]> {
  await latency("read");
  return scopedDb()
    .invoices.filter(
      (i) => i.pangkalanId === pangkalanId && i.status !== "Batal" && invoiceSisa(i) > 0,
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
    { header: "Pangkalan", value: (r) => r.pangkalan, width: 26 },
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
