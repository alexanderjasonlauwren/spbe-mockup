import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Upload } from "lucide-react";
import { useScheduleAgreement } from "@/features/sa/hooks/useScheduleAgreement";
import { SAFilterBar } from "@/features/sa/components/SAFilterBar";
import { SATable } from "@/features/sa/components/SATable";
import { UploadSAForm } from "@/features/sa/components/UploadSAForm";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Meter } from "@/components/common/Panel";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatNumber, formatPercentId } from "@/lib/format";
import type { ScheduleAgreement } from "@/features/sa/types";
import type { UploadSAFormValues } from "@/features/sa/schema";

export function SAManagementPage() {
  const {
    saList,
    isLoading,
    isError,
    error,
    refetch,
    spbeOptions,
    filters,
    setFilters,
    uploadMutation,
    activateMutation,
    deleteMutation,
    printMutation,
  } = useScheduleAgreement();

  const [pendingDelete, setPendingDelete] = useState<ScheduleAgreement | null>(null);
  const [uploading, setUploading] = useState(false);

  const live = saList.filter((s) => s.status === "Aktif" || s.status === "Limit");
  const totalKuota = live.reduce((sum, s) => sum + s.totalKuota, 0);
  const sisaKuota = live.reduce((sum, s) => sum + s.sisaKuota, 0);
  const terpakai = totalKuota - sisaKuota;
  const drafts = saList.filter((s) => s.status === "Draft");
  const expiringSoon = live.filter((s) => s.sisaHari >= 0 && s.sisaHari <= 7);

  const handleUpload = (values: UploadSAFormValues & { namaDokumen?: string }) =>
    uploadMutation.mutate(values, { onSuccess: () => setUploading(false) });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Operasi harian"
        title="Schedule Agreement"
        description="Kuota yang diterbitkan SPBE mitra. Setiap rencana distribusi menarik dari agreement yang aktif, jadi angka di sini adalah batas atas operasi bulan ini."
        actions={
          <Button onClick={() => setUploading(true)}>
            <Upload className="h-3.5 w-3.5" />
            Unggah agreement
          </Button>
        }
      />

      {isError && (
        <Panel spine="text-rust" className="flex items-center gap-3 px-5 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rust-ink" />
          <p className="flex-1 text-sm text-ink">
            Daftar agreement gagal dimuat.{" "}
            <span className="text-ink-muted">{error?.message}</span>
          </p>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </Panel>
      )}

      {expiringSoon.length > 0 && (
        <Panel spine="text-signal" className="flex flex-wrap items-center gap-3 px-5 py-3.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-signal-ink" />
          <p className="flex-1 text-sm text-ink">
            <span className="font-semibold">
              {expiringSoon.length} agreement berakhir dalam sepekan.
            </span>{" "}
            <span className="text-ink-muted">
              Sisa {formatNumber(expiringSoon.reduce((s, x) => s + x.sisaKuota, 0))}{" "}
              tabung akan hangus jika tidak dijadwalkan.
            </span>
          </p>
          <Button asChild size="sm" variant="outline">
            <Link to="/distribution">
              Susun rencana
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel spine={sisaKuota === 0 ? "text-rust" : "text-signal"}>
          <PanelHeader title="Kuota tersedia" hint="Seluruh agreement aktif" />
          <PanelBody>
            <p className="data text-display font-semibold text-ink">
              {formatNumber(sisaKuota)}
            </p>
            <p className="mt-1 text-sm text-ink-muted">tabung siap dijadwalkan</p>
            <Meter
              className="mt-4"
              value={terpakai}
              max={totalKuota}
              tone="ink"
              label="Kuota terpakai"
            />
            <p className="mt-2 text-xs text-ink-muted">
              <span className="data">{formatNumber(terpakai)}</span> dari{" "}
              <span className="data">{formatNumber(totalKuota)}</span> sudah ditarik (
              {formatPercentId(totalKuota === 0 ? 0 : (terpakai / totalKuota) * 100)})
            </p>
          </PanelBody>
        </Panel>

        <Panel className="lg:col-span-2">
          <PanelHeader title="Alur kuota" />
          <PanelBody>
            {/* Numbered because this genuinely is a sequence — quota cannot move
                to the next step until the previous one is done. */}
            <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                "SPBE menerbitkan agreement. Unggah dokumennya, dan sistem mencatatnya sebagai draf.",
                "Aktifkan agreement setelah dokumen diverifikasi. Kuota baru dapat ditarik setelah langkah ini.",
                "Rencana distribusi yang dikonfirmasi menarik kuota dan menerbitkan surat jalan.",
                "Agreement berstatus Limit saat tersisa di bawah 5%, dan Selesai saat habis atau periodenya lewat.",
              ].map((text, i) => (
                <li key={i} className="flex gap-3">
                  <span className="data flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-ink text-2xs font-semibold text-ink-on">
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed text-ink-muted">{text}</p>
                </li>
              ))}
            </ol>
          </PanelBody>
        </Panel>
      </div>

      <SAFilterBar filters={filters} onFilterChange={setFilters} />

      <Panel>
        <PanelHeader
          title="Daftar agreement"
          hint={`${saList.length} agreement · ${drafts.length} menunggu aktivasi`}
        />
        <SATable
          data={saList}
          isLoading={isLoading}
          onActivate={(id) => activateMutation.mutate(id)}
          onPrint={(id) => printMutation.mutate(id)}
          onDelete={setPendingDelete}
          pendingId={activateMutation.variables}
        />
      </Panel>

      <Dialog open={uploading} onOpenChange={setUploading}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unggah Schedule Agreement</DialogTitle>
            <DialogDescription>
              Catat kuota yang diterbitkan SPBE mitra. Agreement masuk sebagai draf
              sampai Anda mengaktifkannya.
            </DialogDescription>
          </DialogHeader>
          <UploadSAForm
            onSubmit={handleUpload}
            isPending={uploadMutation.isPending}
            spbeOptions={spbeOptions}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title={`Hapus ${pendingDelete?.nomorSA}?`}
        message="Agreement ini belum menarik kuota apa pun, jadi aman dihapus. Tindakan ini tidak dapat dibatalkan."
        details={
          pendingDelete && (
            <dl className="space-y-1">
              <div className="flex justify-between gap-4">
                <dt>SPBE</dt>
                <dd className="text-ink">{pendingDelete.spbe}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Total kuota</dt>
                <dd className="data text-ink">{formatNumber(pendingDelete.totalKuota)} tabung</dd>
              </div>
            </dl>
          )
        }
        confirmLabel="Hapus agreement"
        isPending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteMutation.mutate(pendingDelete.id, {
            onSettled: () => setPendingDelete(null),
          });
        }}
      />
    </div>
  );
}
