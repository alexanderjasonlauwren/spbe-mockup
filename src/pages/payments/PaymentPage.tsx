import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, Wallet, XCircle } from "lucide-react";
import { usePayment } from "@/features/payment/hooks/usePayment";
import { VerificationModal } from "@/features/payment/components/VerificationModal";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelHeader } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import { SearchInput, SegmentedControl } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatDateTimeId,
  formatNumber,
  formatRupiah,
  formatRupiahShort,
} from "@/lib/format";
import type { Payment, PaymentStatus } from "@/features/payment/types";

type Tab = PaymentStatus | "Semua";
const TABS: Tab[] = ["Menunggu Verifikasi", "Terverifikasi", "Ditolak", "Semua"];

export function PaymentPage() {
  const {
    payments,
    totals,
    isLoading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    verifyMutation,
    batchMutation,
    exportMutation,
  } = usePayment();

  const [decision, setDecision] = useState<{
    payment: Payment;
    action: "verify" | "reject";
  } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectable = useMemo(
    () => payments.filter((p) => p.status === "Menunggu Verifikasi"),
    [payments],
  );
  const chosen = selectable.filter((p) => selected.has(p.id));
  const allChosen = selectable.length > 0 && chosen.length === selectable.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const columns: Column<Payment>[] = [
    {
      key: "pilih",
      header: "",
      width: "1%",
      headerClassName: "pr-0",
      render: (row) =>
        row.status === "Menunggu Verifikasi" ? (
          <input
            type="checkbox"
            aria-label={`Pilih ${row.kode}`}
            checked={selected.has(row.id)}
            onChange={() => toggle(row.id)}
            className="h-3.5 w-3.5 accent-[rgb(var(--ink))]"
          />
        ) : null,
    },
    {
      key: "kode",
      header: "Invoice",
      render: (row) => (
        <>
          <span className="data block text-xs text-ink">{row.kode}</span>
          {row.suratJalan && (
            <span className="data block text-2xs text-ink-muted">
              {row.suratJalan}
            </span>
          )}
        </>
      ),
      sortValue: (row) => row.kode,
    },
    {
      key: "pangkalan",
      header: "Pangkalan",
      render: (row) => (
        <>
          <Link
            to={`/pangkalan/${row.pangkalanId}`}
            className="block font-medium text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
          >
            {row.pangkalan}
          </Link>
          <span className="block text-xs text-ink-muted">Kec. {row.kecamatan}</span>
        </>
      ),
      sortValue: (row) => row.pangkalan,
    },
    {
      key: "bank",
      header: "Sumber dana",
      render: (row) => (
        <>
          <span className="block text-xs font-medium text-ink">{row.bank}</span>
          <span className="data block text-2xs text-ink-muted">{row.noRekening}</span>
        </>
      ),
      sortValue: (row) => row.bank,
    },
    {
      key: "tanggal",
      header: "Transfer",
      render: (row) => (
        <span className="data text-xs text-ink-muted">
          {formatDateTimeId(row.tanggalBayar)}
        </span>
      ),
      sortValue: (row) => row.tanggalBayar,
    },
    {
      key: "nominal",
      header: "Nominal",
      align: "right",
      render: (row) => (
        <>
          <span className="data block font-semibold text-ink">
            {formatRupiah(row.nominal)}
          </span>
          <span className="data block text-2xs text-ink-muted">
            {formatNumber(row.jumlahTabung)} tabung
          </span>
        </>
      ),
      sortValue: (row) => row.nominal,
    },
    {
      key: "status",
      header: "Status",
      width: "12rem",
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
      render: (row) =>
        row.status === "Menunggu Verifikasi" ? (
          <div className="flex items-center justify-end gap-1">
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
              onClick={() => setDecision({ payment: row, action: "reject" })}
              className="hover:bg-rust-soft hover:text-rust-ink"
            >
              <XCircle className="h-3 w-3" />
              Tolak
            </Button>
          </div>
        ) : (
          <span className="text-2xs text-ink-muted">
            {row.diverifikasiOleh ?? "—"}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Keuangan"
        title="Pembayaran"
        description="Transfer masuk dari pangkalan, dicocokkan dengan surat jalan. Verifikasi menandai tagihan lunas dan memasukkannya ke pendapatan periode."
        actions={
          <Button
            variant="outline"
            onClick={() =>
              exportMutation.mutate(activeTab === "Semua" ? undefined : activeTab)
            }
            disabled={exportMutation.isPending}
          >
            <Download className="h-3.5 w-3.5" />
            Unduh CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Menunggu verifikasi"
          count={totals?.menunggu ?? 0}
          value={formatRupiahShort(totals?.menungguNominal ?? 0)}
          tone={totals && totals.menunggu > 0 ? "signal" : undefined}
        />
        <Stat
          label="Terverifikasi"
          count={totals?.terverifikasi ?? 0}
          value={formatRupiahShort(totals?.terverifikasiNominal ?? 0)}
          tone="pine"
        />
        <Stat
          label="Ditolak"
          count={totals?.ditolak ?? 0}
          value={formatRupiahShort(totals?.ditolakNominal ?? 0)}
          tone={totals && totals.ditolak > 0 ? "rust" : undefined}
        />
      </div>

      <Panel>
        <PanelHeader
          title="Antrian verifikasi"
          hint={`${payments.length} baris ditampilkan`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Invoice, pangkalan, rekening"
                className="w-56"
              />
              <SegmentedControl
                value={activeTab}
                onChange={(tab) => {
                  setActiveTab(tab);
                  setSelected(new Set());
                }}
                options={TABS.map((t) => ({ value: t, label: t }))}
              />
            </div>
          }
        />

        {/* Batch bar appears only when there is something to act on. */}
        {selectable.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-panel-sunk px-5 py-2.5">
            <label className="flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={allChosen}
                onChange={() =>
                  setSelected(
                    allChosen ? new Set() : new Set(selectable.map((p) => p.id)),
                  )
                }
                className="h-3.5 w-3.5 accent-[rgb(var(--ink))]"
              />
              Pilih semua yang menunggu ({selectable.length})
            </label>

            {chosen.length > 0 && (
              <>
                <span className="text-xs text-ink">
                  <span className="data font-semibold">{chosen.length}</span> dipilih ·{" "}
                  <span className="data">
                    {formatRupiah(chosen.reduce((s, p) => s + p.nominal, 0))}
                  </span>
                </span>
                <Button
                  size="sm"
                  className="ml-auto"
                  disabled={batchMutation.isPending}
                  onClick={() =>
                    batchMutation.mutate(
                      chosen.map((p) => p.id),
                      { onSettled: () => setSelected(new Set()) },
                    )
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verifikasi {chosen.length} pembayaran
                </Button>
              </>
            )}
          </div>
        )}

        <DataTable
          columns={columns}
          data={payments}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          spineFor={(row) => spineFor(row.status)}
          pageSize={12}
          defaultSortKey="tanggal"
          defaultSortDir="desc"
          emptyIcon={Wallet}
          emptyMessage={
            activeTab === "Menunggu Verifikasi"
              ? "Tidak ada yang menunggu verifikasi"
              : "Tidak ada pembayaran"
          }
          emptyDescription={
            activeTab === "Menunggu Verifikasi"
              ? "Antrian bersih. Tagihan baru terbit otomatis saat surat jalan ditutup."
              : "Ubah tab atau kata kunci pencarian."
          }
          dense
        />
      </Panel>

      <VerificationModal
        key={decision ? `${decision.payment.id}-${decision.action}` : "none"}
        payment={decision?.payment ?? null}
        action={decision?.action ?? "verify"}
        isPending={verifyMutation.isPending}
        onCancel={() => setDecision(null)}
        onConfirm={(keterangan) =>
          decision &&
          verifyMutation.mutate(
            {
              paymentId: decision.payment.id,
              action: decision.action,
              keterangan,
            },
            { onSuccess: () => setDecision(null) },
          )
        }
      />
    </div>
  );
}

function Stat({
  label,
  count,
  value,
  tone,
}: {
  label: string;
  count: number;
  value: string;
  tone?: "signal" | "pine" | "rust";
}) {
  const spine = {
    signal: "spine text-signal",
    pine: "spine text-pine",
    rust: "spine text-rust",
  };
  return (
    <div className={cn("rounded-md border border-line bg-panel p-4", tone && spine[tone])}>
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p className="data mt-1.5 text-figure font-semibold text-ink">
        {formatNumber(count)}
        <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-ink-muted">
          faktur
        </span>
      </p>
      <p className="data mt-2 text-xs text-ink-muted">{value}</p>
    </div>
  );
}
