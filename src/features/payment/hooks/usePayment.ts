import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPaymentList, verifyPayment } from "../api/paymentApi";
import type { PaymentStatus, VerificationPayload } from "../types";

export function usePayment() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PaymentStatus | "Semua">("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const payments = useQuery({
    queryKey: ["payments", activeTab],
    queryFn: () =>
      getPaymentList(activeTab === "Semua" ? undefined : activeTab),
  });

  const verifyMutation = useMutation({
    mutationFn: (payload: VerificationPayload) => verifyPayment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  const filtered = (payments.data ?? []).filter((p) =>
    p.pangkalan.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return {
    payments: filtered,
    isLoading: payments.isLoading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    verifyMutation,
  };
}
