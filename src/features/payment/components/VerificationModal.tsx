import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

interface VerificationModalProps {
  isOpen: boolean;
  action: "verify" | "reject";
  onConfirm: (keterangan: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

export function VerificationModal({
  isOpen,
  action,
  onConfirm,
  onCancel,
  isPending,
}: VerificationModalProps) {
  const [keterangan, setKeterangan] = useState("");
  const isReject = action === "reject";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReject ? "Tolak Pembayaran" : "Verifikasi Pembayaran"}
          </DialogTitle>
          <DialogDescription>
            {isReject
              ? "Masukkan alasan penolakan pembayaran ini."
              : "Konfirmasi bahwa bukti pembayaran ini sudah valid."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-xs font-bold text-on-surface-variant">
            Keterangan {isReject ? "(Wajib)" : "(Opsional)"}
          </label>
          <textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            rows={3}
            placeholder={
              isReject
                ? "Contoh: Nominal tidak sesuai..."
                : "Catatan tambahan..."
            }
            className="w-full border border-outline-variant rounded-lg p-3 text-sm outline-none focus:border-[#1565C0] resize-none"
          />
        </div>
        <DialogFooter>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold border border-outline-variant rounded-lg hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => {
              onConfirm(keterangan);
              setKeterangan("");
            }}
            disabled={isPending || (isReject && !keterangan.trim())}
            className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-60 ${
              isReject
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#1565C0] hover:bg-[#004d99]"
            }`}
          >
            {isPending
              ? "Memproses..."
              : isReject
                ? "Tolak Pembayaran"
                : "Verifikasi"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
