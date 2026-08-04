import { scopeKey } from "@/mocks/scope";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Plus, Split, Wallet, XCircle } from "lucide-react";
import {
  getOpenInvoices,
  getPayments,
  submitAllocation,
  submitPayment,
  type PaymentView,
} from "@/features/finance/api/financeApi";
import { getPangkalanOptions } from "@/features/distribution/api/distributionApi";
import { decidePayment } from "@/mocks/rules";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import {
  Field,
  SearchInput,
  SegmentedControl,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/common/Field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateId, formatRupiah, formatRupiahShort } from "@/lib/format";
import type { BankNameEntity } from "@/mocks/types";

const TABS = ["Menunggu Verifikasi", "Terverifikasi", "Ditolak", "Semua"];
const BANKS: BankNameEntity[] = ["BCA", "BNI", "Mandiri", "BRI", "BSI"];

function todayIso() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function PaymentPage() {
  const [tab, setTab] = useState("Menunggu Verifikasi");
  const [search, setSearch] = useState("");
  const [decision, setDecision] = useState<{
    payment: PaymentView;
    action: "verify" | "reject";
  } | null>(null);
  const [alasan, setAlasan] = useState("");
  const [allocating, setAllocating] = useState<PaymentView | null>(null);
  const [recording, setRecording] = useState(false);

  const payments = useQuery({
    queryKey: [...scopeKey(), "payments", tab, search],
    queryFn: () => getPayments(tab, search),
  });

  const decideMutation = useDeskMutation({
    mutationFn: (input: {
      id: string;
      action: "verify" | "reject";
      keterangan?: string;
    }) => Promise.resolve(decidePayment(input.id, input.action, input.keterangan)),
    errorTitle: "Verifikasi gagal",
    success: (p) => ({
      title:
        p.status === "Terverifikasi" ? `${p.nomor} diverifikasi` : `${p.nomor} ditolak`,
      description:
        p.status === "Terverifikasi"
          ? `${formatRupiah(p.jumlah)} masuk ke buku besar dan mengurangi piutang.`
          : "Alokasi ke tagihan dibatalkan, piutang kembali terbuka.",
      tone: p.status === "Terverifikasi" ? "success" : "warning",
    }),
    onDone: () => {
      setDecision(null);
      setAlasan("");
    },
  });

  const totals = useMemo(() => {
    const rows = payments.data ?? [];
    return {
      menunggu: rows.filter((p) => p.status === "Menunggu Verifikasi"),
      belumAlokasi: rows.filter((p) => p.belumDialokasikan > 0.5),
    };
  }, [payments.data]);

  const columns: Column<PaymentView>[] = [
    {
      key: "nomor",
      header: "Bukti terima",
      render: (row) => (
        <>
          <span className="data block text-xs text-ink">{row.nomor}</span>
          <span className="data block text-2xs text-ink-muted">
            {formatDateId(row.tanggal)}
          </span>
        </>
      ),
      sortValue: (row) => row.tanggal,
    },
    {
      key: "pangkalan",
      header: "Pangkalan",
      render: (row) => (
        <Link
          to={`/receivables?pangkalan=${row.pangkalanId}`}
          className="font-medium text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
        >
          {row.pangkalan}
        </Link>
      ),
      sortValue: (row) => row.pangkalan,
    },
    {
      key: "bank",
      header: "Sumber dana",
      render: (row) => (
        <>
          <span className="block text-xs text-ink">{row.bank}</span>
          <span className="data block text-2xs text-ink-muted">{row.noRekening}</span>
        </>
      ),
    },
    {
      key: "jumlah",
      header: "Diterima",
      align: "right",
      render: (row) => (
        <span className="data font-semibold text-ink">{formatRupiah(row.jumlah)}</span>
      ),
      sortValue: (row) => row.jumlah,
    },
    {
      key: "alokasi",
      header: "Alokasi",
      render: (row) =>
        row.alokasi.length === 0 ? (
          <span className="text-2xs font-medium text-signal-ink">Belum dialokasikan</span>
        ) : (
          <>
            <span className="data block text-2xs text-ink">
              {row.alokasi.map((a) => a.nomor).join(", ")}
            </span>
            {row.belumDialokasikan > 0.5 && (
              <span className="data block text-2xs text-signal-ink">
                sisa {formatRupiah(row.belumDialokasikan)}
              </span>
            )}
          </>
        ),
      sortValue: (row) => row.belumDialokasikan,
    },
    {
      key: "status",
      header: "Status",
      width: "11rem",
      render: (row) => (
        <>
          <StatusBadge variant={getStatusVariant(row.status)} label={row.status} />
          {row.keterangan && (
            <span className="mt-1 block max-w-[12rem] text-2xs leading-snug text-ink-muted">
              {row.keterangan}
            </span>
          )}
        </>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: "aksi",
      header: "",
      align: "right",
      width: "1%",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.belumDialokasikan > 0.5 && row.status !== "Ditolak" && (
            <Button size="xs" variant="outline" onClick={() => setAllocating(row)}>
              <Split className="h-3 w-3" />
              Alokasikan
            </Button>
          )}
          {row.status === "Menunggu Verifikasi" && (
            <>
              <Button
                size="xs"
                onClick={() => setDecision({ payment: row, action: "verify" })}
              >
                <CheckCircle2 className="h-3 w-3" />
                Verifikasi
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setAlasan("");
                  setDecision({ payment: row, action: "reject" });
                }}
                className="hover:bg-rust-soft hover:text-rust-ink"
              >
                <XCircle className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Keuangan"
        title="Penerimaan Kas"
        description="Uang masuk dari pangkalan. Setiap penerimaan dialokasikan ke tagihan tertentu — satu transfer boleh melunasi beberapa tagihan sekaligus."
        actions={
          <Button onClick={() => setRecording(true)}>
            <Plus className="h-3.5 w-3.5" />
            Catat penerimaan
          </Button>
        }
        meta={
          <span className="text-xs text-ink-muted">
            <span className="data">{totals.menunggu.length}</span> menunggu verifikasi ·{" "}
            <span className="data">{totals.belumAlokasi.length}</span> belum dialokasikan
          </span>
        }
      />

      <Panel>
        <PanelHeader
          title="Daftar penerimaan"
          hint={`${(payments.data ?? []).length} baris`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Nomor, pangkalan, rekening"
                className="w-52"
              />
              <SegmentedControl
                value={tab}
                onChange={setTab}
                options={TABS.map((t) => ({ value: t, label: t }))}
              />
            </div>
          }
        />
        <DataTable
          columns={columns}
          data={payments.data ?? []}
          isLoading={payments.isLoading}
          rowKey={(row) => row.id}
          spineFor={(row) =>
            row.belumDialokasikan > 0.5 ? "text-signal" : spineFor(row.status)
          }
          pageSize={12}
          defaultSortKey="nomor"
          defaultSortDir="desc"
          emptyIcon={Wallet}
          emptyMessage="Tidak ada penerimaan"
          emptyDescription="Catat transfer yang masuk, lalu alokasikan ke tagihan yang dilunasi."
          dense
        />
      </Panel>

      <RecordPaymentDialog open={recording} onOpenChange={setRecording} />
      <AllocateDialog payment={allocating} onClose={() => setAllocating(null)} />

      <Dialog open={!!decision} onOpenChange={(o) => !o && setDecision(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decision?.action === "reject"
                ? `Tolak ${decision?.payment.nomor}`
                : `Verifikasi ${decision?.payment.nomor}`}
            </DialogTitle>
            <DialogDescription>
              {decision?.action === "reject"
                ? "Alokasi ke tagihan dibatalkan dan piutang kembali terbuka."
                : "Kas diakui di buku besar dan piutang berkurang sebesar alokasinya."}
            </DialogDescription>
          </DialogHeader>

          {decision && (
            <div className="rounded-md border border-line bg-panel-sunk p-4 text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-ink-muted">Diterima</span>
                <span className="data font-semibold text-ink">
                  {formatRupiah(decision.payment.jumlah)}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between gap-4">
                <span className="text-ink-muted">Dialokasikan</span>
                <span className="data text-ink">
                  {formatRupiah(
                    decision.payment.jumlah - decision.payment.belumDialokasikan,
                  )}
                </span>
              </div>
              {decision.payment.belumDialokasikan > 0.5 &&
                decision.action === "verify" && (
                  <p className="mt-2 border-t border-line pt-2 text-signal-ink">
                    Sisa {formatRupiah(decision.payment.belumDialokasikan)} belum
                    dialokasikan dan tetap tercatat sebagai kas belum teridentifikasi.
                  </p>
                )}
            </div>
          )}

          <Field
            label={decision?.action === "reject" ? "Alasan penolakan" : "Catatan"}
            htmlFor="alasan"
            required={decision?.action === "reject"}
          >
            <TextareaInput
              id="alasan"
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder={
                decision?.action === "reject"
                  ? "Contoh: nominal transfer tidak cocok dengan mutasi rekening."
                  : "Opsional."
              }
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>
              Batal
            </Button>
            <Button
              variant={decision?.action === "reject" ? "destructive" : "default"}
              disabled={
                decideMutation.isPending ||
                (decision?.action === "reject" && !alasan.trim())
              }
              onClick={() =>
                decision &&
                decideMutation.mutate({
                  id: decision.payment.id,
                  action: decision.action,
                  keterangan: alasan,
                })
              }
            >
              {decision?.action === "reject" ? "Tolak penerimaan" : "Verifikasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── allocation ────────────────────────────────────────────────────────── */

function AllocateDialog({
  payment,
  onClose,
}: {
  payment: PaymentView | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Record<string, number>>({});

  const invoices = useQuery({
    queryKey: [...scopeKey(), "open-invoices", payment?.pangkalanId],
    queryFn: () => getOpenInvoices(payment!.pangkalanId),
    enabled: !!payment,
  });

  useEffect(() => setRows({}), [payment?.id]);

  const mutation = useDeskMutation({
    mutationFn: (input: {
      id: string;
      alokasi: { invoiceId: string; jumlah: number }[];
    }) => submitAllocation(input.id, input.alokasi),
    errorTitle: "Alokasi gagal",
    success: "Penerimaan dialokasikan",
    onDone: onClose,
  });

  const dialokasikan = Object.values(rows).reduce((s, v) => s + (v || 0), 0);
  const tersedia = payment?.belumDialokasikan ?? 0;
  const sisa = tersedia - dialokasikan;

  /** Oldest invoice first — the standard way to apply cash. */
  const autoApply = () => {
    let budget = tersedia;
    const next: Record<string, number> = {};
    for (const inv of invoices.data ?? []) {
      if (budget <= 0) break;
      const take = Math.min(budget, inv.sisa);
      next[inv.id] = Math.round(take);
      budget -= take;
    }
    setRows(next);
  };

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alokasikan {payment?.nomor}</DialogTitle>
          <DialogDescription>
            Tentukan tagihan mana yang dilunasi penerimaan ini. Sisa yang tidak
            dialokasikan tetap tercatat sebagai kas belum teridentifikasi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-panel-sunk px-4 py-3 text-xs">
          <span className="text-ink-muted">
            Tersedia{" "}
            <span className="data font-semibold text-ink">{formatRupiah(tersedia)}</span>
          </span>
          <span className={cn("text-ink-muted", sisa < 0 && "font-semibold text-rust-ink")}>
            Sisa <span className="data font-semibold">{formatRupiah(sisa)}</span>
          </span>
          <Button size="xs" variant="outline" onClick={autoApply}>
            Terapkan otomatis (tertua dulu)
          </Button>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-md border border-line">
          {(invoices.data ?? []).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">
              Tidak ada tagihan terbuka untuk pangkalan ini.
            </p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-panel-sunk">
                  <th className="label px-4 py-2 text-2xs text-ink-muted">Tagihan</th>
                  <th className="label px-4 py-2 text-2xs text-ink-muted">Jatuh tempo</th>
                  <th className="label px-4 py-2 text-right text-2xs text-ink-muted">
                    Sisa
                  </th>
                  <th className="label px-4 py-2 text-right text-2xs text-ink-muted">
                    Alokasi
                  </th>
                </tr>
              </thead>
              <tbody>
                {(invoices.data ?? []).map((inv) => (
                  <tr key={inv.id} className="border-b border-line last:border-b-0">
                    <td className="px-4 py-2">
                      <span className="data block text-xs text-ink">{inv.nomor}</span>
                      <StatusBadge
                        variant={getStatusVariant(inv.status)}
                        label={inv.status}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <span className="data text-xs text-ink-muted">
                        {formatDateId(inv.jatuhTempo)}
                      </span>
                      {inv.umurHari > 0 && (
                        <span className="data block text-2xs text-rust-ink">
                          telat {inv.umurHari} hari
                        </span>
                      )}
                    </td>
                    <td className="data px-4 py-2 text-right text-xs text-ink">
                      {formatRupiah(inv.sisa)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TextInput
                        type="number"
                        mono
                        min={0}
                        max={inv.sisa}
                        aria-label={`Alokasi untuk ${inv.nomor}`}
                        className="w-32 py-1 text-right text-xs"
                        value={rows[inv.id] ?? ""}
                        onChange={(e) =>
                          setRows({ ...rows, [inv.id]: Number(e.target.value) })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            disabled={dialokasikan <= 0 || sisa < 0 || mutation.isPending}
            onClick={() =>
              payment &&
              mutation.mutate({
                id: payment.id,
                alokasi: Object.entries(rows)
                  .filter(([, v]) => v > 0)
                  .map(([invoiceId, jumlah]) => ({ invoiceId, jumlah })),
              })
            }
          >
            Alokasikan {formatRupiahShort(dialokasikan)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── record a receipt ──────────────────────────────────────────────────── */

function RecordPaymentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [form, setForm] = useState({
    pangkalanId: "",
    jumlah: 0,
    tanggal: todayIso(),
    bank: "BCA" as BankNameEntity,
    noRekening: "",
    keterangan: "",
  });

  const pangkalan = useQuery({
    queryKey: [...scopeKey(), "pangkalan-options"],
    queryFn: getPangkalanOptions,
  });

  const mutation = useDeskMutation({
    mutationFn: () => submitPayment(form),
    errorTitle: "Penerimaan tidak tercatat",
    success: (p) => ({
      title: `${p.nomor} dicatat`,
      description: "Alokasikan ke tagihan agar piutang pangkalan berkurang.",
    }),
    onDone: () => onOpenChange(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Catat penerimaan kas</DialogTitle>
          <DialogDescription>
            Untuk transfer yang masuk ke rekening agen. Setelah dicatat, alokasikan
            ke tagihan yang dilunasi.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pangkalan" htmlFor="p-pkl" required className="sm:col-span-2">
            <SelectInput
              id="p-pkl"
              value={form.pangkalanId}
              onChange={(e) => setForm({ ...form, pangkalanId: e.target.value })}
            >
              <option value="">Pilih pangkalan</option>
              {(pangkalan.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Jumlah diterima" htmlFor="p-jml" required>
            <TextInput
              id="p-jml"
              type="number"
              mono
              min={1}
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })}
            />
          </Field>
          <Field label="Tanggal" htmlFor="p-tgl" required>
            <TextInput
              id="p-tgl"
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
          </Field>
          <Field label="Bank pengirim" htmlFor="p-bank">
            <SelectInput
              id="p-bank"
              value={form.bank}
              onChange={(e) =>
                setForm({ ...form, bank: e.target.value as BankNameEntity })
              }
            >
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="No. rekening" htmlFor="p-rek">
            <TextInput
              id="p-rek"
              mono
              value={form.noRekening}
              onChange={(e) => setForm({ ...form, noRekening: e.target.value })}
            />
          </Field>
          <Field label="Keterangan" htmlFor="p-ket" className="sm:col-span-2">
            <TextInput
              id="p-ket"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!form.pangkalanId || form.jumlah <= 0 || mutation.isPending}
            onClick={() => mutation.mutate(undefined as never)}
          >
            Catat penerimaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
