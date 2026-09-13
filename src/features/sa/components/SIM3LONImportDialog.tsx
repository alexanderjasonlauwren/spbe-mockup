import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Field, FileDrop, SelectInput, TextInput } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getProducts } from "@/features/products/api/productApi";
import { scopeKey } from "@/mocks/scope";
import { formatNumber } from "@/lib/format";
import { supplierLabel, unitLabel } from "@/lib/lexicon";
import { useSIM3LONImport } from "../hooks/useSIM3LONImport";
import type { SIM3LONPreview } from "../types";

export function SIM3LONImportDialog({ open, onClose, supplierOptions = [] }: {
  open: boolean;
  onClose: () => void;
  supplierOptions?: string[];
}) {
  const [file, setFile] = useState<File | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [productId, setProductId] = useState("");
  const products = useQuery({
    queryKey: [...scopeKey(), "sim3lon-product-options"],
    queryFn: () => getProducts({ onlyActive: true }),
    enabled: open,
  });
  const { preview, discard, previewMutation, applyMutation } = useSIM3LONImport();

  const close = () => {
    setFile(null);
    setSupplierName("");
    setProductId("");
    discard();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Impor Penyaluran Harian SIM3LON</DialogTitle>
          <DialogDescription>
            Unggah ekspor XLSX bulanan, periksa perubahan dan pangkalan yang belum di-seed,
            lalu terapkan sebagai sumber kebenaran bulan tersebut.
          </DialogDescription>
        </DialogHeader>

        {preview ? (
          <Review preview={preview} pending={applyMutation.isPending}
            onBack={() => { discard(); setFile(null); }}
            onApply={() => applyMutation.mutate(preview.id, { onSuccess: close })} />
        ) : (
          <div className="space-y-4">
            <Field label={`${supplierLabel()} penerbit`} required>
              <TextInput value={supplierName} onChange={(event) => setSupplierName(event.target.value)}
                list="sim3lon-suppliers" placeholder={`Ketik nama ${supplierLabel()}`} />
              <datalist id="sim3lon-suppliers">
                {supplierOptions.map((name) => <option key={name} value={name} />)}
              </datalist>
            </Field>
            <Field label="Produk" required hint="Pilih LPG 3 kg untuk contoh Penyaluran Harian ini.">
              <SelectInput value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Pilih produk</option>
                {(products.data ?? []).map((product) => (
                  <option key={product.id} value={product.id}>{product.nama} · {product.ukuran}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Ekspor Penyaluran Harian" required
              hint="Sheet wajib bernama Penyaluran Harian dan memuat seluruh tanggal dalam satu bulan.">
              <FileDrop file={file} onFile={setFile}
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                hint="XLSX SIM3LON, maksimal 4 MB" disabled={previewMutation.isPending} />
            </Field>
            <p className="text-xs leading-relaxed text-ink-muted">
              Id Registrasi dicocokkan ke kode pangkalan. Sistem tidak membuat pangkalan dari nama
              atau mengarang nomor telepon, lokasi, maupun cabang yang tidak ada di berkas.
            </p>
            <Button className="w-full" disabled={!file || !supplierName.trim() || !productId || previewMutation.isPending}
              onClick={() => file && previewMutation.mutate({ file, supplierName, productId })}>
              {previewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {previewMutation.isPending ? "Membaca XLSX…" : "Pratinjau perubahan"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Review({ preview, pending, onBack, onApply }: {
  preview: SIM3LONPreview;
  pending: boolean;
  onBack: () => void;
  onApply: () => void;
}) {
  const blocked = !preview.canApply;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-sm bg-panel-sunk px-3.5 py-2.5">
        <FileSpreadsheet className="mt-0.5 h-4 w-4 text-ink-muted" />
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink">{preview.fileName}</p>
          <p className="data text-2xs text-ink-muted">{preview.month} · sha256 {preview.checksum.slice(0, 16)}…</p>
          {preview.duplicate && <p className="mt-1 text-xs text-signal-ink">Berkas identik sudah pernah diunggah.</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Count label="Pangkalan" value={preview.outletCount} />
        <Count label="Alokasi" value={preview.totals.allocationQty} />
        <Count label="Normal" value={preview.totals.normalQty} />
        <Count label="Fakultatif" value={preview.totals.fakultatifQty} />
        <Count label="Sisa" value={preview.totals.remainingQty} />
      </div>

      <div className="rounded-sm border border-line p-3 text-xs text-ink-muted">
        <p><span className="data text-ink">{preview.matchedCount}/{preview.outletCount}</span> pangkalan cocok dengan master.</p>
        <p>{formatNumber(preview.changes.dailyChanged)} nilai harian dan {formatNumber(preview.changes.allocationChanged)} alokasi berubah dari impor yang terakhir diterapkan.</p>
        <p>Fakultatif disimpan sebagai SA terpisah tanpa tanggal; berkas tidak menyatakan tanggal penyalurannya.</p>
      </div>

      {(preview.missingOutlets.length > 0 || preview.issues.length > 0) && (
        <div className="max-h-52 overflow-y-auto rounded-sm bg-rust-soft px-3.5 py-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-rust-ink">
            <AlertTriangle className="h-3.5 w-3.5" /> Impor belum dapat diterapkan
          </p>
          <ul className="mt-2 space-y-1 text-2xs text-ink">
            {preview.missingOutlets.map((outlet) => (
              <li key={outlet.registrationCode}><span className="data">{outlet.registrationCode}</span> · {outlet.name} — {outlet.reason}</li>
            ))}
            {preview.issues.map((issue, index) => (
              <li key={`${issue.line}-${index}`}>Baris {issue.line}{issue.column ? ` · ${issue.column}` : ""} — {issue.reason}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs leading-relaxed text-ink-muted">
        Penerapan memperbarui target alokasi pangkalan, SA Base, SA Fakultatif, dan target harian Base.
        Sistem belum membuat surat jalan dari kolom penyaluran; rencana distribusi tetap dikonfirmasi operator.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onBack} disabled={pending}>Ganti berkas</Button>
        <Button className="flex-1" onClick={onApply} disabled={blocked || pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? "Menerapkan…" : `Terapkan ${formatNumber(preview.outletCount)} pangkalan`}
        </Button>
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return <div className="rounded-sm bg-panel-sunk px-2.5 py-2 text-center">
    <p className="data text-sm font-semibold text-ink">{formatNumber(value)}</p>
    <p className="text-2xs text-ink-muted">{label}{label === "Pangkalan" ? "" : ` (${unitLabel()})`}</p>
  </div>;
}
