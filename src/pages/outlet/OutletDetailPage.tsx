import { scopeKey } from "@/mocks/scope";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Truck,
  UserRound,
} from "lucide-react";
import {
  getOutletDetail,
  getOutletHistory,
} from "@/features/outlet/api/outletApi";
import { printSuratJalan } from "@/features/monitoring/api/monitoringApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Meter, Skeleton } from "@/components/common/Panel";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  formatDateId,
  formatNumber,
  formatPercentId,
  formatRupiah,
} from "@/lib/format";
import { outletLabel, outletLabelTitle, unitLabel } from "@/lib/lexicon";

type HistoryRow = Awaited<ReturnType<typeof getOutletHistory>>[number];

export function OutletDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const detail = useQuery({
    queryKey: [...scopeKey(), "outlet-detail", id],
    queryFn: () => getOutletDetail(id),
  });

  const history = useQuery({
    queryKey: [...scopeKey(), "outlet-history", id],
    queryFn: () => getOutletHistory(id, 12),
  });

  const printMutation = useDeskMutation({
    mutationFn: (deliveryId: string) => printSuratJalan(deliveryId),
    errorTitle: "Cetak surat jalan gagal",
  });

  const columns: Column<HistoryRow>[] = [
    {
      key: "kode",
      header: "Surat jalan",
      render: (row) => <span className="data text-xs text-ink">{row.kode}</span>,
      sortValue: (row) => row.kode,
    },
    {
      key: "tanggal",
      header: "Tanggal",
      render: (row) => (
        <span className="text-ink-muted">
          {formatDateId(row.tanggal)} <span className="data">{row.jam}</span>
        </span>
      ),
      sortValue: (row) => `${row.tanggal}${row.jam}`,
    },
    {
      key: "driver",
      header: "Driver",
      render: (row) => <span className="text-ink-muted">{row.driver}</span>,
      sortValue: (row) => row.driver,
    },
    {
      key: "muatan",
      header: "Realisasi / target",
      align: "right",
      render: (row) => (
        <span className="data text-ink">
          {formatNumber(row.realisasi)}
          <span className="text-ink-muted"> / {formatNumber(row.target)}</span>
        </span>
      ),
      sortValue: (row) => row.realisasi,
    },
    {
      key: "status",
      header: "Status",
      width: "8rem",
      render: (row) => (
        <StatusBadge variant={getStatusVariant(row.status)} label={row.status} />
      ),
    },
    {
      key: "aksi",
      header: "",
      align: "right",
      width: "1%",
      render: (row) => (
        <Button
          variant="ghost"
          size="xs"
          onClick={() => printMutation.mutate(row.id)}
          disabled={printMutation.isPending}
        >
          <Printer className="h-3 w-3" />
          Cetak
        </Button>
      ),
    },
  ];

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
          icon={MapPin}
          title={`${outletLabelTitle()} tidak ditemukan`}
          description={`Data mungkin sudah dihapus. Kembali ke daftar untuk memilih ${outletLabel()} lain.`}
          action={
            <Button asChild size="sm">
              <Link to="/outlet">Ke daftar outlet</Link>
            </Button>
          }
        />
      </Panel>
    );
  }

  const p = detail.data;
  const kuotaPakai = p.kuotaBulanan === 0 ? 0 : (p.terpakaiBulanIni / p.kuotaBulanan) * 100;

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali
      </Button>

      <PageHeader
        eyebrow={`${p.kode} · Kec. ${p.kecamatan}`}
        title={p.nama}
        description={`${p.alamat}, ${p.kota}`}
        meta={<StatusBadge variant={getStatusVariant(p.status)} label={p.status} />}
        actions={
          <Button asChild variant="outline">
            <Link to={`/outlet/${p.id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Ubah data
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader title="Kuota bulan berjalan" />
          <PanelBody className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="data truncate text-figure font-semibold text-ink">
                  {formatNumber(p.sisaKuota)}
                  <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-ink-muted">
                    {unitLabel()} tersisa
                  </span>
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  <span className="data">{formatNumber(p.terpakaiBulanIni)}</span> dari{" "}
                  <span className="data">{formatNumber(p.kuotaBulanan)}</span> terpakai (
                  {formatPercentId(kuotaPakai)})
                </p>
              </div>
            </div>
            <Meter
              value={p.terpakaiBulanIni}
              max={p.kuotaBulanan}
              tone={kuotaPakai > 95 ? "rust" : "signal"}
              label={`Kuota terpakai ${formatPercentId(kuotaPakai)}`}
            />
          </PanelBody>
        </Panel>

        <Panel spine={p.tagihanTertunda > 0 ? "text-signal" : undefined}>
          <PanelHeader title="Tagihan tertunda" />
          <PanelBody>
            <p className="data truncate text-figure font-semibold text-ink">
              {formatNumber(p.tagihanTertunda)}
              <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-ink-muted">
                faktur
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              Senilai <span className="data">{formatRupiah(p.nilaiTertunda)}</span>
            </p>
            {p.tagihanTertunda > 0 && (
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to="/payments">Verifikasi pembayaran</Link>
              </Button>
            )}
          </PanelBody>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Kontak" />
          <PanelBody className="space-y-3 text-sm">
            <p className="flex items-center gap-2.5 text-ink">
              <UserRound className="h-4 w-4 shrink-0 text-ink-muted" />
              {p.penanggungJawab || "Belum diisi"}
            </p>
            <a
              href={`tel:${p.telepon}`}
              className="flex items-center gap-2.5 text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
            >
              <Phone className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="data">{p.telepon || "—"}</span>
            </a>
            <p className="flex items-start gap-2.5 text-ink-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {p.alamat}, Kec. {p.kecamatan}, {p.kota}
                <br />
                <span className="data text-2xs">
                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                </span>
              </span>
            </p>
            <p className="border-t border-line pt-3 text-xs text-ink-muted">
              Terdaftar sejak <span className="data">{formatDateId(p.terdaftarPada)}</span>
              {p.pengirimanTerakhir && (
                <>
                  {" · "}pengiriman terakhir{" "}
                  <span className="data">{formatDateId(p.pengirimanTerakhir)}</span>
                </>
              )}
            </p>
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Riwayat pengiriman"
            hint="Dua belas surat jalan terakhir"
          />
          <DataTable
            columns={columns}
            data={history.data ?? []}
            isLoading={history.isLoading}
            rowKey={(row) => row.id}
            spineFor={(row) => spineFor(row.status)}
            emptyIcon={Truck}
            emptyMessage="Belum ada pengiriman"
            emptyDescription={`Riwayat muncul setelah ${outletLabel()} ini masuk rencana distribusi yang dikonfirmasi.`}
            dense
          />
        </Panel>
      </div>
    </div>
  );
}
