import { scopeKey } from "@/mocks/scope";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, TriangleAlert } from "lucide-react";
import {
  getChartOfAccounts,
  getJournals,
  getProfitAndLoss,
  getTrialBalance,
} from "@/features/finance/api/financeApi";
import { defaultRange } from "@/features/transactions/api/transactionApi";
import { PageHeader } from "@/components/common/PageHeader";
import {
  Panel,
  PanelBody,
  PanelHeader,
  Skeleton,
} from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import { Field, SegmentedControl, TextInput } from "@/components/common/Field";
import { StatusBadge } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import { formatDateId, formatRupiah, formatRupiahShort } from "@/lib/format";

type Tab = "jurnal" | "neraca-saldo" | "laba-rugi" | "bagan";

export function LedgerPage() {
  const [tab, setTab] = useState<Tab>("jurnal");
  const [range, setRange] = useState(defaultRange);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Keuangan"
        title="Buku Besar"
        description="Setiap tagihan, penerimaan, dan nota kredit memposting jurnal berpasangan ke sini. Laporan di bawah dihitung dari jurnal, bukan dari tabel operasional."
        actions={
          <div className="flex items-end gap-2">
            <Field label="Dari" htmlFor="l-from">
              <TextInput
                id="l-from"
                type="date"
                mono
                className="py-1.5 text-xs"
                value={range.from}
                max={range.to}
                onChange={(e) => setRange({ ...range, from: e.target.value })}
              />
            </Field>
            <Field label="Sampai" htmlFor="l-to">
              <TextInput
                id="l-to"
                type="date"
                mono
                className="py-1.5 text-xs"
                value={range.to}
                min={range.from}
                onChange={(e) => setRange({ ...range, to: e.target.value })}
              />
            </Field>
          </div>
        }
        meta={
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "jurnal" as const, label: "Jurnal" },
              { value: "neraca-saldo" as const, label: "Neraca saldo" },
              { value: "laba-rugi" as const, label: "Laba rugi" },
              { value: "bagan" as const, label: "Bagan akun" },
            ]}
          />
        }
      />

      {tab === "jurnal" && <JournalSection range={range} />}
      {tab === "neraca-saldo" && <TrialBalanceSection range={range} />}
      {tab === "laba-rugi" && <ProfitLossSection range={range} />}
      {tab === "bagan" && <ChartSection />}
    </div>
  );
}

/* ── journals ──────────────────────────────────────────────────────────── */

function JournalSection({ range }: { range: { from: string; to: string } }) {
  const journals = useQuery({
    queryKey: [...scopeKey(), "journals", range],
    queryFn: () => getJournals(range),
  });

  if (journals.isLoading) return <Skeleton className="h-96 w-full" />;
  const rows = journals.data ?? [];

  return (
    <Panel>
      <PanelHeader
        title="Jurnal umum"
        hint={`${rows.length} entri pada periode ini · entri yang sudah diposting tidak dapat diubah, hanya dibalik`}
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Belum ada jurnal pada periode ini"
          description="Jurnal terbentuk otomatis saat tagihan terbit, kas diterima, atau nota kredit diterbitkan."
        />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((j) => (
            <li key={j.id} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="flex items-center gap-2">
                  <span className="data text-xs font-semibold text-ink">
                    {j.nomor}
                  </span>
                  {j.status === "Dibatalkan" && (
                    <StatusBadge variant="draft" label="Dibalik" />
                  )}
                </p>
                <p className="data text-2xs text-ink-muted">
                  {formatDateId(j.tanggal)}
                </p>
              </div>
              <p className="mt-0.5 text-sm text-ink">{j.keterangan}</p>

              {/* Three columns of mono amounts with no break opportunity in a
                  digit-grouped number: without a scroller this overflows the
                  page, unlike the two tables further down this file. */}
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[22rem] text-left">
                  <thead>
                    <tr>
                      <th className="label pb-1 text-2xs text-ink-muted">
                        Akun
                      </th>
                      <th className="label pb-1 text-right text-2xs text-ink-muted">
                        Debit
                      </th>
                      <th className="label pb-1 text-right text-2xs text-ink-muted">
                        Kredit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {j.lines.map((l, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="py-1.5 text-xs text-ink">
                          <span className="data text-ink-muted">
                            {l.akun?.kode}
                          </span>{" "}
                          {l.akun?.nama}
                        </td>
                        <td className="data py-1.5 text-right text-xs text-ink">
                          {l.debit > 0 ? formatRupiah(l.debit) : "—"}
                        </td>
                        <td className="data py-1.5 text-right text-xs text-ink">
                          {l.kredit > 0 ? formatRupiah(l.kredit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── trial balance ─────────────────────────────────────────────────────── */

function TrialBalanceSection({
  range,
}: {
  range: { from: string; to: string };
}) {
  const tb = useQuery({
    queryKey: [...scopeKey(), "trial-balance", range],
    queryFn: () => getTrialBalance(range),
  });

  if (tb.isLoading || !tb.data) return <Skeleton className="h-96 w-full" />;
  const seimbang = Math.abs(tb.data.totalDebit - tb.data.totalKredit) < 0.01;

  return (
    <>
      <Panel spine={seimbang ? "text-pine" : "text-rust"}>
        <PanelBody className="flex flex-wrap items-center gap-3">
          {seimbang ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-pine-ink" />
          ) : (
            <TriangleAlert className="h-4 w-4 shrink-0 text-rust-ink" />
          )}
          <p className="flex-1 text-sm text-ink">
            {seimbang ? (
              <>
                <span className="font-semibold">Buku besar seimbang.</span>{" "}
                <span className="text-ink-muted">
                  Total debit dan kredit sama, jadi laporan di bawah dapat
                  dipercaya.
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">
                  Buku besar tidak seimbang.
                </span>{" "}
                <span className="text-ink-muted">
                  Selisih{" "}
                  {formatRupiah(
                    Math.abs(tb.data.totalDebit - tb.data.totalKredit),
                  )}
                  .
                </span>
              </>
            )}
          </p>
          <span className="data text-xs text-ink-muted">
            D {formatRupiahShort(tb.data.totalDebit)} · K{" "}
            {formatRupiahShort(tb.data.totalKredit)}
          </span>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Neraca saldo" hint="Mutasi periode terpilih" />
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-panel-sunk">
                <th className="label px-5 py-2.5 text-2xs text-ink-muted">
                  Akun
                </th>
                <th className="label px-5 py-2.5 text-right text-2xs text-ink-muted">
                  Debit
                </th>
                <th className="label px-5 py-2.5 text-right text-2xs text-ink-muted">
                  Kredit
                </th>
                <th className="label px-5 py-2.5 text-right text-2xs text-ink-muted">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {tb.data.rows.map((r) => (
                <tr key={r.akun.id} className="border-b border-line">
                  <td className="px-5 py-2.5 text-sm text-ink">
                    <span className="data text-xs text-ink-muted">
                      {r.akun.kode}
                    </span>{" "}
                    {r.akun.nama}
                  </td>
                  <td className="data px-5 py-2.5 text-right text-sm text-ink">
                    {r.debit > 0 ? formatRupiah(r.debit) : "—"}
                  </td>
                  <td className="data px-5 py-2.5 text-right text-sm text-ink">
                    {r.kredit > 0 ? formatRupiah(r.kredit) : "—"}
                  </td>
                  <td className="data px-5 py-2.5 text-right text-sm font-semibold text-ink">
                    {formatRupiah(r.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-ink">
              <tr>
                <td className="px-5 py-3 text-xs font-semibold text-ink">
                  Total
                </td>
                <td className="data px-5 py-3 text-right text-xs font-semibold text-ink">
                  {formatRupiah(tb.data.totalDebit)}
                </td>
                <td className="data px-5 py-3 text-right text-xs font-semibold text-ink">
                  {formatRupiah(tb.data.totalKredit)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>
    </>
  );
}

/* ── profit and loss ───────────────────────────────────────────────────── */

function ProfitLossSection({ range }: { range: { from: string; to: string } }) {
  const pl = useQuery({
    queryKey: [...scopeKey(), "profit-loss", range],
    queryFn: () => getProfitAndLoss(range),
  });

  if (pl.isLoading || !pl.data) return <Skeleton className="h-96 w-full" />;
  const p = pl.data;
  const marginPct =
    p.totalPendapatan === 0 ? 0 : (p.labaKotor / p.totalPendapatan) * 100;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Figure
          label="Pendapatan bersih"
          value={formatRupiahShort(p.totalPendapatan)}
        />
        <Figure
          label="Laba kotor"
          value={formatRupiahShort(p.labaKotor)}
          hint={`Margin ${marginPct.toFixed(1)}%`}
          tone="pine"
        />
        <Figure label="Total beban" value={formatRupiahShort(p.totalBeban)} />
        <Figure
          label="Laba bersih"
          value={formatRupiahShort(p.labaBersih)}
          tone={p.labaBersih >= 0 ? "pine" : "rust"}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Laporan laba rugi"
          hint="Dihitung dari jurnal periode ini"
        />
        <div className="divide-y divide-line">
          <Section
            title="Pendapatan"
            rows={p.pendapatan}
            total={p.totalPendapatan}
          />
          <Section title="Beban" rows={p.beban} total={p.totalBeban} />
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm font-semibold text-ink">Laba bersih</span>
            <span
              className={cn(
                "data text-lg font-semibold",
                p.labaBersih >= 0 ? "text-pine-ink" : "text-rust-ink",
              )}
            >
              {formatRupiah(p.labaBersih)}
            </span>
          </div>
        </div>
      </Panel>
    </>
  );
}

function Section({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { akun: { id: string; kode: string; nama: string }; saldo: number }[];
  total: number;
}) {
  const visible = rows.filter((r) => r.saldo !== 0);
  return (
    <div className="px-5 py-4">
      <p className="label mb-2 text-2xs text-ink-muted">{title}</p>
      {visible.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Belum ada mutasi pada periode ini.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {visible.map((r) => (
            <li key={r.akun.id} className="flex justify-between gap-4 text-sm">
              <span className="text-ink-muted">
                <span className="data text-2xs">{r.akun.kode}</span>{" "}
                {r.akun.nama}
              </span>
              <span className="data text-ink">{formatRupiah(r.saldo)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2.5 flex justify-between gap-4 border-t border-line pt-2.5 text-sm font-semibold">
        <span className="text-ink">Total {title.toLowerCase()}</span>
        <span className="data text-ink">{formatRupiah(total)}</span>
      </div>
    </div>
  );
}

/* ── chart of accounts ─────────────────────────────────────────────────── */

function ChartSection() {
  const chart = useQuery({
    queryKey: [...scopeKey(), "chart-of-accounts"],
    queryFn: getChartOfAccounts,
  });
  if (chart.isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Panel>
      <PanelHeader
        title="Bagan akun"
        hint="Akun bertanda sistem dipakai aturan pemostingan dan tidak dapat dihapus"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-panel-sunk">
              <th className="label px-5 py-2.5 text-2xs text-ink-muted">
                Kode
              </th>
              <th className="label px-5 py-2.5 text-2xs text-ink-muted">
                Nama akun
              </th>
              <th className="label px-5 py-2.5 text-2xs text-ink-muted">
                Tipe
              </th>
              <th className="label px-5 py-2.5 text-2xs text-ink-muted">
                Saldo normal
              </th>
              <th className="label px-5 py-2.5 text-right text-2xs text-ink-muted">
                Saldo berjalan
              </th>
            </tr>
          </thead>
          <tbody>
            {(chart.data ?? []).map((r) => (
              <tr key={r.akun.id} className="border-b border-line">
                <td className="data px-5 py-2.5 text-xs text-ink-muted">
                  {r.akun.kode}
                </td>
                <td className="px-5 py-2.5 text-sm text-ink">
                  {r.akun.nama}
                  {r.akun.sistem && (
                    <span className="ml-2 rounded-sm bg-panel-raised px-1.5 py-0.5 text-2xs text-ink-muted">
                      sistem
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-xs text-ink-muted">
                  {r.akun.tipe}
                </td>
                <td className="px-5 py-2.5 text-xs capitalize text-ink-muted">
                  {r.akun.saldoNormal}
                </td>
                <td className="data px-5 py-2.5 text-right text-sm text-ink">
                  {formatRupiah(r.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "pine" | "rust";
}) {
  const spine = { pine: "spine text-pine", rust: "spine text-rust" };
  return (
    <div
      className={cn(
        "rounded-md border border-line bg-panel p-4",
        tone && spine[tone],
      )}
    >
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p className="data mt-1.5 text-figure font-semibold text-ink">{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}
