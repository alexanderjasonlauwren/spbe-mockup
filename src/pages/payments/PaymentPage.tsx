import { useState } from "react";
import { usePayment } from "@/features/payment/hooks/usePayment";
import { PaymentTabs } from "@/features/payment/components/PaymentTabs";
import { PaymentFilterBar } from "@/features/payment/components/PaymentFilterBar";
import { PaymentCard } from "@/features/payment/components/PaymentCard";
import { VerificationModal } from "@/features/payment/components/VerificationModal";
import { EmptyState } from "@/components/common/EmptyState";
import { CreditCard } from "lucide-react";
import type { PaymentStatus } from "@/features/payment/types";

type ModalState = { id: string; action: "verify" | "reject" } | null;

type TabKey = "Semua" | PaymentStatus;

export function PaymentPage() {
  const {
    payments,
    isLoading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    verifyMutation,
  } = usePayment();

  const [modal, setModal] = useState<ModalState>(null);

  const counts: Record<TabKey, number> = {
    Semua: payments.length,
    "Menunggu Verifikasi": payments.filter(
      (p) => p.status === "Menunggu Verifikasi"
    ).length,
    Terverifikasi: payments.filter((p) => p.status === "Terverifikasi").length,
    Ditolak: payments.filter((p) => p.status === "Ditolak").length,
  };

  const handleConfirm = (keterangan: string) => {
    if (!modal) return;
    verifyMutation.mutate(
      { paymentId: modal.id, action: modal.action, keterangan },
      { onSuccess: () => setModal(null) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-on-surface">Pembayaran</h1>
        <PaymentFilterBar
          search={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        <PaymentTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          counts={counts}
        />

        <div className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-48 bg-slate-100 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="Tidak ada pembayaran"
              description="Belum ada data pembayaran untuk tab ini"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {payments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onVerify={(id) => setModal({ id, action: "verify" })}
                  onReject={(id) => setModal({ id, action: "reject" })}
                  isPending={verifyMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <VerificationModal
        isOpen={!!modal}
        action={modal?.action ?? "verify"}
        onConfirm={handleConfirm}
        onCancel={() => setModal(null)}
        isPending={verifyMutation.isPending}
      />
    </div>
  );
}
