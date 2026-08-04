import { useState } from "react";
import { FileImage, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, TextareaInput } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant } from "@/lib/status";
import { formatDateTimeId, formatNumber, formatRupiah } from "@/lib/format";
import type { Payment } from "../types";

interface VerificationModalProps {
  payment: Payment | null;
  action: "verify" | "reject";
  onConfirm: (keterangan: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function VerificationModal({
  payment,
  action,
  onConfirm,
  onCancel,
  isPending,
}: VerificationModalProps) {
  // The parent remounts this by key per payment+action, so the note starts
  // empty for each decision without an effect resetting it.
  const [keterangan, setKeterangan] = useState("");
  const isReject = action === "reject";

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && !isPending && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReject ? "Tolak pembayaran" : "Verifikasi pembayaran"}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? "Pangkalan akan diberi tahu alasannya, dan tagihan tetap terbuka."
              : "Tagihan ditandai lunas dan masuk ke pendapatan periode ini."}
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="rounded-md border border-line bg-panel-sunk p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="data text-2xs text-ink-muted">{payment.kode}</p>
                <p className="truncate text-sm font-semibold text-ink">
                  {payment.pangkalan}
                </p>
                <p className="text-xs text-ink-muted">Kec. {payment.kecamatan}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="data text-lg font-semibold text-ink">
                  {formatRupiah(payment.nominal)}
                </p>
                <p className="data text-2xs text-ink-muted">
                  {formatNumber(payment.jumlahTabung)} tabung
                </p>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-3 text-xs">
              <div>
                <dt className="text-ink-muted">Bank</dt>
                <dd className="font-medium text-ink">{payment.bank}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">No. rekening</dt>
                <dd className="data text-ink">{payment.noRekening}</dd>
              </div>
              <div>
                <dt className="text-ink-muted">Tanggal transfer</dt>
                <dd className="data text-ink">
                  {formatDateTimeId(payment.tanggalBayar)}
                </dd>
              </div>
              <div>
                <dt className="text-ink-muted">Surat jalan</dt>
                <dd className="data text-ink">{payment.suratJalan ?? "—"}</dd>
              </div>
            </dl>

            {payment.buktiTransfer && (
              <p className="mt-3 flex items-center gap-2 border-t border-line pt-3 text-xs text-ink-muted">
                <FileImage className="h-3.5 w-3.5 shrink-0" />
                <span className="data truncate">{payment.buktiTransfer}</span>
              </p>
            )}
            <div className="mt-3">
              <StatusBadge
                variant={getStatusVariant(payment.status)}
                label={payment.status}
              />
            </div>
          </div>
        )}

        <Field
          label={isReject ? "Alasan penolakan" : "Catatan"}
          htmlFor="keterangan"
          required={isReject}
          hint={
            isReject
              ? undefined
              : "Opsional. Tercatat pada jejak aktivitas bersama nama Anda."
          }
        >
          <TextareaInput
            id="keterangan"
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder={
              isReject
                ? "Contoh: nominal transfer kurang Rp 240.000 dari surat jalan."
                : "Contoh: bukti transfer cocok dengan mutasi rekening."
            }
          />
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Batal
          </Button>
          <Button
            variant={isReject ? "destructive" : "default"}
            disabled={isPending || (isReject && !keterangan.trim())}
            onClick={() => onConfirm(keterangan)}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isReject ? "Tolak pembayaran" : "Verifikasi pembayaran"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
