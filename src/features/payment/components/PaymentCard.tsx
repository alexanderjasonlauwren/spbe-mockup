import { CheckCircle, XCircle } from "lucide-react";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import { formatCurrency } from "@/lib/utils";
import { BANK_COLORS } from "@/utils/constants";
import type { Payment } from "../types";

interface PaymentCardProps {
  payment: Payment;
  onVerify: (id: string) => void;
  onReject: (id: string) => void;
  isPending: boolean;
}

export function PaymentCard({
  payment,
  onVerify,
  onReject,
  isPending,
}: PaymentCardProps) {
  const bankColor = BANK_COLORS[payment.bank] ?? "#64748b";
  const canAct = payment.status === "Menunggu Verifikasi";

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      {/* Top section - Bank */}
      <div
        className="h-1.5 rounded-t-xl"
        style={{ backgroundColor: bankColor }}
      />
      <div className="p-5 flex items-start justify-between gap-4">
        {/* Left info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black px-2 py-0.5 rounded text-white uppercase"
              style={{ backgroundColor: bankColor }}
            >
              {payment.bank}
            </span>
            <StatusBadge
              variant={getStatusVariant(payment.status)}
              label={payment.status}
            />
          </div>
          <p className="text-sm font-bold text-on-surface">
            {payment.pangkalan}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {payment.tanggalBayar}
          </p>
        </div>

        {/* Right amount */}
        <div className="text-right">
          <p className="text-lg font-black text-on-surface">
            {formatCurrency(payment.nominal)}
          </p>
          <p className="text-xs text-on-surface-variant">
            {payment.jumlahTabung} tabung
          </p>
        </div>
      </div>

      {/* Middle - details */}
      <div className="px-5 pb-4 border-t border-slate-50 pt-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-on-surface-variant">No. Rekening</p>
            <p className="font-bold text-on-surface">{payment.noRekening}</p>
          </div>
          {payment.keterangan && (
            <div>
              <p className="text-on-surface-variant">Keterangan</p>
              <p className="font-medium text-on-surface">
                {payment.keterangan}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      {canAct && (
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => onVerify(payment.id)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-colors disabled:opacity-60"
          >
            <CheckCircle className="h-4 w-4" />
            Verifikasi
          </button>
          <button
            onClick={() => onReject(payment.id)}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
          >
            <XCircle className="h-4 w-4" />
            Tolak
          </button>
        </div>
      )}
    </div>
  );
}
