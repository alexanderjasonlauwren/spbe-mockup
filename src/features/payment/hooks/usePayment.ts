import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import { formatCurrency } from "@/lib/utils";
import {
  exportPayments,
  getPaymentList,
  getPaymentTotals,
  verifyPayment,
  verifyPaymentBatch,
} from "../api/paymentApi";
import type { PaymentStatus, VerificationPayload } from "../types";

export function usePayment() {
  const [activeTab, setActiveTab] = useState<PaymentStatus | "Semua">(
    "Menunggu Verifikasi",
  );
  const [searchQuery, setSearchQuery] = useState("");

  const payments = useQuery({
    queryKey: ["payments", activeTab, searchQuery],
    queryFn: () =>
      getPaymentList(activeTab === "Semua" ? undefined : activeTab, searchQuery),
  });

  const totals = useQuery({
    queryKey: ["payment-totals"],
    queryFn: getPaymentTotals,
  });

  const verifyMutation = useDeskMutation({
    mutationFn: (payload: VerificationPayload) => verifyPayment(payload),
    errorTitle: "Verifikasi gagal",
    success: (payment) => ({
      title:
        payment.status === "Terverifikasi"
          ? `${payment.kode} diverifikasi`
          : `${payment.kode} ditolak`,
      description:
        payment.status === "Terverifikasi"
          ? `${formatCurrency(payment.nominal)} dari ${payment.pangkalan} tercatat lunas.`
          : payment.keterangan,
      tone: payment.status === "Terverifikasi" ? "success" : "warning",
    }),
  });

  const batchMutation = useDeskMutation({
    mutationFn: (ids: string[]) => verifyPaymentBatch(ids),
    errorTitle: "Verifikasi massal gagal",
    success: (result) => ({
      title: `${result.verified} pembayaran diverifikasi`,
      description:
        result.failures.length > 0
          ? `${result.failures.length} gagal: ${result.failures[0]}`
          : undefined,
      tone: result.failures.length > 0 ? "warning" : "success",
    }),
  });

  const exportMutation = useDeskMutation({
    mutationFn: (status?: PaymentStatus) => exportPayments(status),
    errorTitle: "Unduh gagal",
    success: (count) => ({
      title: "Berkas CSV diunduh",
      description: `${count} baris pembayaran diekspor.`,
    }),
  });

  return {
    payments: payments.data ?? [],
    totals: totals.data,
    isLoading: payments.isLoading,
    isError: payments.isError,
    error: payments.error as Error | null,
    refetch: payments.refetch,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    verifyMutation,
    batchMutation,
    exportMutation,
  };
}
