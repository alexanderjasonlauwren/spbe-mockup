/**
 * The general ledger: chart of accounts and double-entry posting.
 *
 * Every event that moves money posts a balanced journal here. Reports are then
 * derived from the ledger rather than recomputed from operational tables, which
 * is what makes the finance figures reconcilable instead of merely plausible.
 */

import { stampScope } from "./scope";
import type {
  AccountEntity,
  AccountRole,
  Database,
  ID,
  JournalEntity,
  JournalLine,
  JournalSourceType,
} from "./types";

/* ── chart of accounts ─────────────────────────────────────────────────── */

type Seed = Omit<AccountEntity, "id"> & { id?: ID };

/** A small Indonesian chart, enough to close a period for a distribution agency. */
const CHART: Seed[] = [
  // Aset
  { kode: "1-0000", nama: "ASET", tipe: "Aset", saldoNormal: "debit", sistem: true, aktif: true },
  { kode: "1-1000", nama: "Kas", tipe: "Aset", saldoNormal: "debit", induk: "1-0000", role: "kas", sistem: true, aktif: true },
  { kode: "1-1100", nama: "Bank", tipe: "Aset", saldoNormal: "debit", induk: "1-0000", role: "bank", sistem: true, aktif: true },
  { kode: "1-1200", nama: "Piutang Usaha", tipe: "Aset", saldoNormal: "debit", induk: "1-0000", role: "piutang", sistem: true, aktif: true },
  { kode: "1-1300", nama: "Persediaan Tabung", tipe: "Aset", saldoNormal: "debit", induk: "1-0000", role: "persediaan", sistem: true, aktif: true },

  // Kewajiban
  { kode: "2-0000", nama: "KEWAJIBAN", tipe: "Kewajiban", saldoNormal: "kredit", sistem: true, aktif: true },
  { kode: "2-1000", nama: "Utang Usaha", tipe: "Kewajiban", saldoNormal: "kredit", induk: "2-0000", sistem: true, aktif: true },
  { kode: "2-1200", nama: "PPN Keluaran", tipe: "Kewajiban", saldoNormal: "kredit", induk: "2-0000", role: "ppnKeluaran", sistem: true, aktif: true },

  // Ekuitas
  { kode: "3-0000", nama: "EKUITAS", tipe: "Ekuitas", saldoNormal: "kredit", sistem: true, aktif: true },
  { kode: "3-1000", nama: "Modal Disetor", tipe: "Ekuitas", saldoNormal: "kredit", induk: "3-0000", sistem: true, aktif: true },
  { kode: "3-2000", nama: "Laba Ditahan", tipe: "Ekuitas", saldoNormal: "kredit", induk: "3-0000", role: "labaDitahan", sistem: true, aktif: true },

  // Pendapatan
  { kode: "4-0000", nama: "PENDAPATAN", tipe: "Pendapatan", saldoNormal: "kredit", sistem: true, aktif: true },
  { kode: "4-1000", nama: "Penjualan LPG", tipe: "Pendapatan", saldoNormal: "kredit", induk: "4-0000", role: "pendapatan", sistem: true, aktif: true },
  { kode: "4-1900", nama: "Retur & Potongan Penjualan", tipe: "Pendapatan", saldoNormal: "debit", induk: "4-0000", role: "returPenjualan", sistem: true, aktif: true },

  // Beban
  { kode: "5-0000", nama: "BEBAN", tipe: "Beban", saldoNormal: "debit", sistem: true, aktif: true },
  { kode: "5-1000", nama: "Harga Pokok Penjualan", tipe: "Beban", saldoNormal: "debit", induk: "5-0000", role: "hpp", sistem: true, aktif: true },
  { kode: "5-2000", nama: "Beban Angkut", tipe: "Beban", saldoNormal: "debit", induk: "5-0000", sistem: false, aktif: true },
  { kode: "5-3000", nama: "Beban Operasional", tipe: "Beban", saldoNormal: "debit", induk: "5-0000", sistem: false, aktif: true },
];

export function seedAccounts(): AccountEntity[] {
  return CHART.map((a, i) => ({ ...a, id: `acc-${String(i + 1).padStart(3, "0")}` }));
}

/** Finds a posting account by role. Throws loudly — a missing role is a bug. */
export function accountByRole(db: Database, role: AccountRole): AccountEntity {
  const found = db.accounts.find((a) => a.role === role);
  if (!found) {
    throw new Error(
      `Akun dengan peran "${role}" tidak ada di bagan akun. Periksa Konfigurasi Sistem.`,
    );
  }
  return found;
}

/* ── posting ───────────────────────────────────────────────────────────── */

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Posts a balanced journal.
 *
 * Refuses to post if debits and credits disagree — an unbalanced ledger is
 * worse than no ledger, because every report downstream silently lies.
 */
export function postJournal(
  db: Database,
  input: {
    tanggal: string;
    keterangan: string;
    sumber: { tipe: JournalSourceType; id: ID };
    lines: JournalLine[];
    aktor: string;
    reversalDari?: ID;
    /** Defaults to the active branch; pass the source row's scope explicitly. */
    scope?: { tenantId: ID; branchId: ID };
  },
): JournalEntity {
  const lines = input.lines
    .map((l) => ({ ...l, debit: round(l.debit), kredit: round(l.kredit) }))
    .filter((l) => l.debit !== 0 || l.kredit !== 0);

  if (lines.length < 2) {
    throw new Error("Jurnal harus memiliki minimal dua baris.");
  }

  const totalDebit = round(lines.reduce((s, l) => s + l.debit, 0));
  const totalKredit = round(lines.reduce((s, l) => s + l.kredit, 0));
  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal tidak seimbang: debit ${totalDebit.toLocaleString("id-ID")} vs kredit ${totalKredit.toLocaleString("id-ID")}.`,
    );
  }

  const seq = db.journals.length + 1;
  const entry: JournalEntity = {
    // A journal carries the branch it was raised in, so one chart of accounts
    // yields both consolidated and per-branch reports.
    ...stampScope({}, input.scope),
    id: `jrn-${Date.now().toString(36)}${seq.toString(36)}`,
    nomor: `JV-${input.tanggal.replace(/-/g, "")}-${String(seq).padStart(4, "0")}`,
    tanggal: input.tanggal,
    keterangan: input.keterangan,
    sumber: input.sumber,
    lines,
    status: "Diposting",
    reversalDari: input.reversalDari,
    dibuatOleh: input.aktor,
    dibuatPada: new Date().toISOString(),
  };
  db.journals.unshift(entry);
  return entry;
}

/** Cancels an entry by posting its mirror. Posted journals are never edited. */
export function reverseJournal(db: Database, journalId: ID, aktor: string, alasan: string) {
  const original = db.journals.find((j) => j.id === journalId);
  if (!original) throw new Error("Jurnal tidak ditemukan.");
  if (original.status === "Dibatalkan") throw new Error("Jurnal ini sudah dibalik.");

  const reversal = postJournal(db, {
    scope: { tenantId: original.tenantId, branchId: original.branchId },
    tanggal: new Date().toISOString().slice(0, 10),
    keterangan: `Pembalikan ${original.nomor} — ${alasan}`,
    sumber: original.sumber,
    lines: original.lines.map((l) => ({
      akunId: l.akunId,
      debit: l.kredit,
      kredit: l.debit,
      memo: l.memo,
    })),
    aktor,
    reversalDari: original.id,
  });
  original.status = "Dibatalkan";
  return reversal;
}

/* ── derived reads ─────────────────────────────────────────────────────── */

export interface AccountBalance {
  akun: AccountEntity;
  debit: number;
  kredit: number;
  /** Signed by the account's normal balance, so a positive figure reads right. */
  saldo: number;
}

/** Movement per account within a window; omit dates for all time. */
export function accountBalances(
  db: Database,
  range?: { from?: string; to?: string },
): AccountBalance[] {
  const totals = new Map<ID, { debit: number; kredit: number }>();

  for (const j of db.journals) {
    if (j.status !== "Diposting") continue;
    if (range?.from && j.tanggal < range.from) continue;
    if (range?.to && j.tanggal > range.to) continue;
    for (const l of j.lines) {
      const row = totals.get(l.akunId) ?? { debit: 0, kredit: 0 };
      row.debit += l.debit;
      row.kredit += l.kredit;
      totals.set(l.akunId, row);
    }
  }

  return db.accounts
    .filter((a) => !a.kode.endsWith("-0000"))
    .map((akun) => {
      const t = totals.get(akun.id) ?? { debit: 0, kredit: 0 };
      const saldo =
        akun.saldoNormal === "debit" ? t.debit - t.kredit : t.kredit - t.debit;
      return { akun, debit: round(t.debit), kredit: round(t.kredit), saldo: round(saldo) };
    });
}

export interface ProfitAndLoss {
  pendapatan: AccountBalance[];
  beban: AccountBalance[];
  totalPendapatan: number;
  totalBeban: number;
  labaKotor: number;
  labaBersih: number;
}

/** Income statement for a period, straight from the ledger. */
export function profitAndLoss(
  db: Database,
  range: { from: string; to: string },
): ProfitAndLoss {
  const balances = accountBalances(db, range);
  const pendapatan = balances.filter((b) => b.akun.tipe === "Pendapatan");
  const beban = balances.filter((b) => b.akun.tipe === "Beban");

  // Contra-revenue (returns) carries a debit normal balance, so summing the
  // signed figures nets it off revenue automatically.
  const totalPendapatan = round(
    pendapatan.reduce(
      (s, b) => s + (b.akun.saldoNormal === "kredit" ? b.saldo : -b.saldo),
      0,
    ),
  );
  const totalBeban = round(beban.reduce((s, b) => s + b.saldo, 0));
  const hpp = beban.find((b) => b.akun.role === "hpp")?.saldo ?? 0;

  return {
    pendapatan,
    beban,
    totalPendapatan,
    totalBeban,
    labaKotor: round(totalPendapatan - hpp),
    labaBersih: round(totalPendapatan - totalBeban),
  };
}

/** Debit and credit totals must agree; if they do not, something is wrong. */
export function trialBalance(db: Database, range?: { from?: string; to?: string }) {
  const rows = accountBalances(db, range).filter(
    (b) => b.debit !== 0 || b.kredit !== 0,
  );
  return {
    rows,
    totalDebit: round(rows.reduce((s, r) => s + r.debit, 0)),
    totalKredit: round(rows.reduce((s, r) => s + r.kredit, 0)),
  };
}
