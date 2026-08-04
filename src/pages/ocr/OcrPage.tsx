import { scopeKey } from "@/mocks/scope";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  FileScan,
  Loader2,
  ScanLine,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  acceptReceipt,
  declineReceipt,
  getOcrSummary,
  getReceipts,
  uploadReceipt,
  type ReceiptView,
} from "@/features/ocr/api/ocrApi";
import { getPangkalanOptions } from "@/features/distribution/api/distributionApi";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel, PanelBody, PanelHeader, Meter, Skeleton } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Field,
  FileDrop,
  SegmentedControl,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/common/Field";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
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
import {
  formatDateId,
  formatNumber,
  formatPercentId,
  formatRupiah,
  formatRupiahShort,
  relativeTime,
} from "@/lib/format";
import type { BankNameEntity, ReceiptStatus } from "@/mocks/types";

const BANKS: BankNameEntity[] = ["BCA", "BNI", "Mandiri", "BRI", "BSI"];
const TABS: (ReceiptStatus | "Semua")[] = [
  "Menunggu Review",
  "Tervalidasi",
  "Ditolak",
  "Semua",
];

/** Below this, the scan is treated as a guess a human must confirm. */
const TRUST_THRESHOLD = 0.8;

export function OcrPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Menunggu Review");
  const [file, setFile] = useState<File | null>(null);
  const [reviewing, setReviewing] = useState<ReceiptView | null>(null);
  const [rejecting, setRejecting] = useState<ReceiptView | null>(null);
  const [alasan, setAlasan] = useState("");
  const [draft, setDraft] = useState({
    pangkalanId: "",
    nomorKwitansi: "",
    tanggalKwitansi: "",
    jumlahTabung: 0,
    nominal: 0,
    bank: "" as BankNameEntity | "",
  });

  const receipts = useQuery({
    queryKey: [...scopeKey(), "receipts", tab],
    queryFn: () => getReceipts(tab === "Semua" ? undefined : tab),
  });
  const summary = useQuery({ queryKey: [...scopeKey(), "ocr-summary"], queryFn: getOcrSummary });
  const pangkalan = useQuery({
    queryKey: [...scopeKey(), "pangkalan-options"],
    queryFn: getPangkalanOptions,
  });

  useEffect(() => {
    if (!reviewing) return;
    setDraft({
      pangkalanId: reviewing.pangkalanId ?? "",
      nomorKwitansi: reviewing.nomorKwitansi,
      tanggalKwitansi: reviewing.tanggalKwitansi,
      jumlahTabung: reviewing.jumlahTabung,
      nominal: reviewing.nominal,
      bank: reviewing.bank ?? "",
    });
  }, [reviewing]);

  const uploadMutation = useDeskMutation({
    mutationFn: (f: File) => uploadReceipt(f),
    errorTitle: "Pemindaian gagal",
    success: (r) => ({
      title: `${r.namaBerkas} dipindai`,
      description:
        r.keyakinan < TRUST_THRESHOLD
          ? `Keyakinan ${formatPercentId(r.keyakinan * 100)} — sebagian isian perlu dilengkapi manual.`
          : `Keyakinan ${formatPercentId(r.keyakinan * 100)}. Periksa hasilnya lalu validasi.`,
      tone: r.keyakinan < TRUST_THRESHOLD ? "warning" : "success",
    }),
    onDone: (r) => {
      setFile(null);
      setReviewing(r);
    },
  });

  const acceptMutation = useDeskMutation({
    mutationFn: ({ id, edits }: { id: string; edits: Record<string, unknown> }) =>
      acceptReceipt(id, edits),
    errorTitle: "Validasi gagal",
    success: (r) => ({
      title: `${r.nomorKwitansi} tervalidasi`,
      description: r.kodePembayaran
        ? `Tagihan ${r.kodePembayaran} terbit dan menunggu verifikasi di Pembayaran.`
        : undefined,
    }),
    onDone: () => setReviewing(null),
  });

  const rejectMutation = useDeskMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      declineReceipt(id, reason),
    errorTitle: "Penolakan gagal",
    success: (r) => ({ title: `Kwitansi ${r.namaBerkas} ditolak`, tone: "warning" }),
    onDone: () => {
      setRejecting(null);
      setAlasan("");
    },
  });

  const rows = receipts.data ?? [];
  const s = summary.data;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Keuangan"
        title="OCR Kwitansi"
        description="Pindai bukti transfer dari pangkalan. Hasil yang divalidasi langsung menerbitkan tagihan untuk diverifikasi tim keuangan."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Menunggu review"
          value={formatNumber(s?.menungguReview ?? 0)}
          unit="kwitansi"
          tone={s && s.menungguReview > 0 ? "signal" : undefined}
        />
        <Stat label="Tervalidasi" value={formatNumber(s?.tervalidasi ?? 0)} unit="kwitansi" tone="pine" />
        <Stat label="Ditolak" value={formatNumber(s?.ditolak ?? 0)} unit="kwitansi" />
        <Stat
          label="Nilai tervalidasi"
          value={formatRupiahShort(s?.nilaiTervalidasi ?? 0)}
          hint={`Rerata keyakinan pindai ${formatPercentId((s?.rerataKeyakinan ?? 0) * 100)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="h-fit">
          <PanelHeader title="Pindai kwitansi" />
          <PanelBody className="space-y-4">
            <FileDrop
              file={file}
              onFile={setFile}
              accept="image/*,application/pdf"
              hint="JPG, PNG, atau PDF"
              label="Letakkan foto kwitansi di sini"
              disabled={uploadMutation.isPending}
            />
            <Button
              className="w-full"
              disabled={!file || uploadMutation.isPending}
              onClick={() => file && uploadMutation.mutate(file)}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanLine className="h-4 w-4" />
              )}
              {uploadMutation.isPending ? "Memindai…" : "Pindai kwitansi"}
            </Button>

            <div className="rounded-md border border-line bg-panel-sunk p-3">
              <p className="label mb-2 text-2xs text-ink-muted">Cara kerja</p>
              {/* Numbered because the steps are strictly sequential. */}
              <ol className="space-y-2">
                {[
                  "Sistem membaca nomor kwitansi, tanggal, jumlah tabung, dan nominal dari gambar.",
                  `Isian dengan keyakinan di bawah ${Math.round(TRUST_THRESHOLD * 100)}% dikosongkan agar diisi manual, bukan ditebak.`,
                  "Validasi menerbitkan tagihan yang menunggu verifikasi di halaman Pembayaran.",
                ].map((text, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="data flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-ink text-[0.5625rem] font-semibold text-ink-on">
                      {i + 1}
                    </span>
                    <p className="text-2xs leading-relaxed text-ink-muted">{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </PanelBody>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Antrian kwitansi"
            hint={`${rows.length} berkas`}
            actions={
              <SegmentedControl
                value={tab}
                onChange={setTab}
                options={TABS.map((t) => ({ value: t, label: t }))}
              />
            }
          />

          {receipts.isLoading ? (
            <div className="space-y-4 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={FileScan}
              title="Antrian kosong"
              description="Unggah foto kwitansi dari panel di samping untuk mulai memindai."
            />
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const low = r.keyakinan < TRUST_THRESHOLD;
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "spine flex flex-wrap items-center gap-4 px-5 py-3.5",
                      spineFor(r.status),
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="data truncate text-xs text-ink">{r.namaBerkas}</p>
                      <p className="mt-0.5 truncate text-sm font-medium text-ink">
                        {r.pangkalan}
                      </p>
                      <p className="text-2xs text-ink-muted">
                        {r.nomorKwitansi || "Nomor belum terbaca"} ·{" "}
                        <span className="data">{formatDateId(r.tanggalKwitansi)}</span> ·
                        diunggah <span className="data">{relativeTime(r.diunggahPada)}</span>
                      </p>
                    </div>

                    <div className="w-28 shrink-0">
                      <p className="data text-sm font-semibold text-ink">
                        {formatRupiah(r.nominal)}
                      </p>
                      <p className="data text-2xs text-ink-muted">
                        {formatNumber(r.jumlahTabung)} tabung
                      </p>
                    </div>

                    <div className="w-28 shrink-0">
                      <p
                        className={cn(
                          "mb-1 text-2xs font-semibold",
                          low ? "text-rust-ink" : "text-ink-muted",
                        )}
                      >
                        Keyakinan {formatPercentId(r.keyakinan * 100)}
                      </p>
                      <Meter
                        value={r.keyakinan * 100}
                        max={100}
                        tone={low ? "rust" : "pine"}
                        label={`Keyakinan pindai ${formatPercentId(r.keyakinan * 100)}`}
                      />
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge
                        variant={getStatusVariant(r.status)}
                        label={r.status}
                      />
                      {r.status === "Menunggu Review" ? (
                        <>
                          <Button size="xs" onClick={() => setReviewing(r)}>
                            Tinjau
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setRejecting(r)}
                            className="hover:bg-rust-soft hover:text-rust-ink"
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      ) : r.kodePembayaran ? (
                        <Button asChild size="xs" variant="outline">
                          <Link to="/payments">{r.kodePembayaran}</Link>
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {/* Review & correct */}
      <Dialog open={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Tinjau hasil pindai</DialogTitle>
            <DialogDescription>
              Periksa setiap isian terhadap gambar kwitansi. Validasi menerbitkan
              tagihan yang menunggu verifikasi keuangan.
            </DialogDescription>
          </DialogHeader>

          {reviewing && reviewing.keyakinan < TRUST_THRESHOLD && (
            <p className="spine flex items-start gap-2.5 rounded-md bg-signal-soft px-3.5 py-2.5 text-signal">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-ink" />
              <span className="text-xs leading-relaxed text-ink">
                Keyakinan pindai hanya{" "}
                {formatPercentId(reviewing.keyakinan * 100)}. Isian yang tidak
                terbaca dikosongkan — lengkapi sebelum memvalidasi.
              </span>
            </p>
          )}

          <div className="space-y-4">
            <Field label="Pangkalan" htmlFor="ocr-pkl" required>
              <SelectInput
                id="ocr-pkl"
                value={draft.pangkalanId}
                invalid={!draft.pangkalanId}
                onChange={(e) => setDraft({ ...draft, pangkalanId: e.target.value })}
              >
                <option value="">Belum dikenali — pilih pangkalan</option>
                {(pangkalan.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </SelectInput>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Nomor kwitansi" htmlFor="ocr-no">
                <TextInput
                  id="ocr-no"
                  mono
                  placeholder="KW/1234/2026"
                  value={draft.nomorKwitansi}
                  onChange={(e) => setDraft({ ...draft, nomorKwitansi: e.target.value })}
                />
              </Field>
              <Field label="Tanggal kwitansi" htmlFor="ocr-tgl">
                <TextInput
                  id="ocr-tgl"
                  type="date"
                  value={draft.tanggalKwitansi}
                  onChange={(e) =>
                    setDraft({ ...draft, tanggalKwitansi: e.target.value })
                  }
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Jumlah tabung" htmlFor="ocr-jml">
                <TextInput
                  id="ocr-jml"
                  type="number"
                  min={0}
                  mono
                  value={draft.jumlahTabung}
                  onChange={(e) =>
                    setDraft({ ...draft, jumlahTabung: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label="Nominal (Rp)" htmlFor="ocr-nom" required>
                <TextInput
                  id="ocr-nom"
                  type="number"
                  min={1}
                  mono
                  invalid={draft.nominal <= 0}
                  value={draft.nominal}
                  onChange={(e) => setDraft({ ...draft, nominal: Number(e.target.value) })}
                />
              </Field>
            </div>

            <Field label="Bank pengirim" htmlFor="ocr-bank">
              <SelectInput
                id="ocr-bank"
                value={draft.bank}
                onChange={(e) =>
                  setDraft({ ...draft, bank: e.target.value as BankNameEntity })
                }
              >
                <option value="">Belum terbaca</option>
                {BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)}>
              Batal
            </Button>
            <Button
              disabled={
                !draft.pangkalanId || draft.nominal <= 0 || acceptMutation.isPending
              }
              onClick={() =>
                reviewing &&
                acceptMutation.mutate({
                  id: reviewing.id,
                  edits: {
                    pangkalanId: draft.pangkalanId,
                    nomorKwitansi: draft.nomorKwitansi,
                    tanggalKwitansi: draft.tanggalKwitansi,
                    jumlahTabung: draft.jumlahTabung,
                    nominal: draft.nominal,
                    bank: draft.bank || null,
                  },
                })
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              Validasi &amp; terbitkan tagihan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject */}
      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tolak kwitansi</DialogTitle>
            <DialogDescription>
              Berkas ditandai ditolak dan tidak menerbitkan tagihan.
            </DialogDescription>
          </DialogHeader>

          <Field label="Alasan penolakan" htmlFor="ocr-alasan" required>
            <TextareaInput
              id="ocr-alasan"
              rows={3}
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: gambar buram, nominal tidak terbaca."
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!alasan.trim() || rejectMutation.isPending}
              onClick={() =>
                rejecting && rejectMutation.mutate({ id: rejecting.id, reason: alasan })
              }
            >
              Tolak kwitansi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  hint,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: "signal" | "pine";
}) {
  const spine = { signal: "spine text-signal", pine: "spine text-pine" };
  return (
    <div className={cn("rounded-md border border-line bg-panel p-4", tone && spine[tone])}>
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p className="data mt-1.5 text-figure font-semibold text-ink">
        {value}
        {unit && (
          <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-ink-muted">
            {unit}
          </span>
        )}
      </p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-ink-muted">{hint}</p>}
    </div>
  );
}
