import { scopeKey } from "@/mocks/scope";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Package, Store } from "lucide-react";
import { getImportSummary, getSADetail } from "@/features/sa/api/saApi";
import type { SAImportedOutlet, SAProductQuota } from "@/features/sa/types";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Skeleton } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant } from "@/lib/status";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { formatDateId, formatNumber } from "@/lib/format";
import { unitLabel } from "@/lib/lexicon";

const productColumns: Column<SAProductQuota>[] = [
  {
    key: "produk",
    header: "Produk",
    render: (row) => <span className="font-medium text-ink">{row.productName}</span>,
    sortValue: (row) => row.productName,
  },
  {
    key: "total",
    header: "Total kuota",
    align: "right",
    render: (row) => <span className="data text-ink">{formatNumber(row.totalKuota)}</span>,
    sortValue: (row) => row.totalKuota,
  },
  {
    key: "dialokasikan",
    header: "Dialokasikan",
    align: "right",
    render: (row) => <span className="data text-ink">{formatNumber(row.dialokasikan)}</span>,
    sortValue: (row) => row.dialokasikan,
  },
  {
    key: "sisa",
    header: "Sisa",
    align: "right",
    render: (row) => (
      <span className="data font-semibold text-ink">{formatNumber(row.sisaKuota)}</span>
    ),
    sortValue: (row) => row.sisaKuota,
  },
];

const outletColumns: Column<SAImportedOutlet>[] = [
  {
    key: "nama",
    header: "Pangkalan",
    render: (row) => (
      <>
        <span className="block font-medium text-ink">{row.nama}</span>
        <span className="data block text-2xs text-ink-muted">{row.registrationCode}</span>
      </>
    ),
    sortValue: (row) => row.nama,
  },
  {
    key: "alokasi",
    header: "Alokasi",
    align: "right",
    render: (row) => <span className="data text-ink">{formatNumber(row.alokasi)}</span>,
    sortValue: (row) => row.alokasi,
  },
  {
    key: "normal",
    header: "Normal",
    align: "right",
    render: (row) => <span className="data text-ink-muted">{formatNumber(row.normal)}</span>,
    sortValue: (row) => row.normal,
  },
  {
    key: "fakultatif",
    header: "Fakultatif",
    align: "right",
    render: (row) => <span className="data text-ink-muted">{formatNumber(row.fakultatif)}</span>,
    sortValue: (row) => row.fakultatif,
  },
  {
    key: "sisa",
    header: "Sisa",
    align: "right",
    render: (row) => (
      <span className="data font-semibold text-ink">{formatNumber(row.sisa)}</span>
    ),
    sortValue: (row) => row.sisa,
  },
];

export function SADetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: [...scopeKey(), "sa-detail", id],
    queryFn: () => getSADetail(id),
  });

  const importSummary = useQuery({
    queryKey: [...scopeKey(), "sa-import-summary", id],
    queryFn: () => getImportSummary(id),
  });

  if (detail.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (detail.isError || !detail.data) {
    return (
      <Panel>
        <EmptyState
          icon={FileText}
          title="Schedule Agreement tidak ditemukan"
          description="Data mungkin sudah dihapus. Kembali ke daftar untuk memilih yang lain."
          action={
            <Button asChild size="sm">
              <Link to="/sa">Ke daftar Schedule Agreement</Link>
            </Button>
          }
        />
      </Panel>
    );
  }

  const sa = detail.data;
  const summary = importSummary.data;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali
      </Button>

      <PageHeader
        eyebrow={`Schedule Agreement · ${sa.supplier}`}
        title={sa.nomorSA}
        description={`Periode ${formatDateId(sa.periodeMulai)} – ${formatDateId(sa.periodeBerakhir)}.`}
        meta={<StatusBadge variant={getStatusVariant(sa.status)} label={sa.status} />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total kuota" value={formatNumber(sa.totalKuota)} unit={unitLabel()} />
        <Stat
          label="Sudah didistribusikan"
          value={formatNumber(sa.sudahDidistribusikan)}
          unit={unitLabel()}
        />
        <Stat label="Sisa kuota" value={formatNumber(sa.sisaKuota)} unit={unitLabel()} />
        <Stat label="Rencana" value={formatNumber(sa.jumlahRencana)} unit="rencana" />
      </div>

      <Panel>
        <PanelHeader
          title="Produk"
          hint="Kuota per produk di balik angka total di atas"
        />
        <DataTable
          columns={productColumns}
          data={sa.products}
          isLoading={false}
          rowKey={(row) => row.productId}
          emptyIcon={Package}
          emptyMessage="Belum ada kuota produk"
          emptyDescription="Agreement ini dicatat manual dan belum punya kuota per produk, atau belum diterapkan dari sebuah impor."
          dense
        />
      </Panel>

      <Panel>
        <PanelHeader
          title="Data impor"
          hint={
            summary
              ? "Cek data impor terhadap dokumen aslinya"
              : "Agreement ini dicatat manual, tidak berasal dari impor"
          }
        />
        <PanelBody className="space-y-4">
          {importSummary.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : summary ? (
            <>
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <Field label="Berkas" value={summary.namaBerkas ?? "—"} />
                <Field label="Supplier" value={summary.supplier ?? "—"} />
                <Field
                  label="Diimpor pada"
                  value={summary.diimporPada ? formatDateId(summary.diimporPada) : "Belum diterapkan"}
                />
              </div>
              {summary.checksum && (
                <p className="data break-all text-2xs text-ink-muted">
                  SHA-256 {summary.checksum}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              Tidak ada berkas impor di balik agreement ini.
            </p>
          )}
        </PanelBody>
      </Panel>

      {summary && summary.outlets.length > 0 && (
        <Panel>
          <PanelHeader
            title="Pangkalan diimpor"
            hint={`${summary.outlets.length} pangkalan tercatat dari berkas ini`}
          />
          <DataTable
            columns={outletColumns}
            data={summary.outlets}
            isLoading={false}
            rowKey={(row) => row.registrationCode}
            emptyIcon={Store}
            emptyMessage="Tidak ada pangkalan"
            dense
          />
        </Panel>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p className="data mt-1.5 truncate text-figure font-semibold text-ink">
        {value}
        {unit && (
          <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-ink-muted">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}
