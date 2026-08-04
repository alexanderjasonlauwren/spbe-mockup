import { scopeKey } from "@/mocks/scope";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import {
  addApprovedOrders,
  cancelDistributionPlan,
  confirmPlan,
  createPlan,
  getActiveSaOptions,
  getDriverOptions,
  getPangkalanOptions,
  getPlanDetail,
  getPlanList,
  printRouteSheet,
  saveDraft,
} from "../api/distributionApi";
import type { PlanRow } from "../types";

export function useDistributionPlan() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const planList = useQuery({ queryKey: [...scopeKey(), "plan-list"], queryFn: getPlanList });

  // Open on the plan that needs attention: today's, or the newest draft.
  useEffect(() => {
    if (selectedPlanId || !planList.data?.length) return;
    const draft = planList.data.find((p) => p.status === "Draft");
    setSelectedPlanId(draft?.id ?? planList.data[0].id);
  }, [planList.data, selectedPlanId]);

  const planDetail = useQuery({
    queryKey: [...scopeKey(), "plan-detail", selectedPlanId],
    queryFn: () => getPlanDetail(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const pangkalanOptions = useQuery({
    queryKey: [...scopeKey(), "pangkalan-options"],
    queryFn: getPangkalanOptions,
  });

  const driverOptions = useQuery({
    queryKey: [...scopeKey(), "driver-options", selectedPlanId],
    queryFn: () => getDriverOptions(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const saOptions = useQuery({
    queryKey: [...scopeKey(), "active-sa-options"],
    queryFn: getActiveSaOptions,
  });

  const saveDraftMutation = useDeskMutation({
    mutationFn: ({ planId, rows }: { planId: string; rows: PlanRow[] }) =>
      saveDraft(planId, rows),
    errorTitle: "Draf tidak tersimpan",
    success: "Draf disimpan",
  });

  const confirmPlanMutation = useDeskMutation({
    mutationFn: (planId: string) => confirmPlan(planId),
    errorTitle: "Konfirmasi gagal",
    success: (result) => ({
      title: "Rencana dikonfirmasi",
      description: `${result.deliveries} surat jalan terbit dan ${result.total.toLocaleString("id-ID")} tabung ditarik dari kuota SA. Pantau di Monitoring Distribusi.`,
    }),
  });

  const createPlanMutation = useDeskMutation({
    mutationFn: createPlan,
    errorTitle: "Rencana tidak dibuat",
    success: (plan) => ({
      title: `Rencana ${plan.kode} dibuat`,
      description: "Tambahkan pangkalan dan tetapkan driver sebelum konfirmasi.",
    }),
    onDone: (plan) => setSelectedPlanId(plan.id),
  });

  const cancelPlanMutation = useDeskMutation({
    mutationFn: (planId: string) => cancelDistributionPlan(planId),
    errorTitle: "Pembatalan gagal",
    success: () => ({
      title: "Rencana dibatalkan",
      description: "Kuota dikembalikan ke Schedule Agreement.",
    }),
  });

  const addOrdersMutation = useDeskMutation({
    mutationFn: ({ planId, orderIds }: { planId: string; orderIds: string[] }) =>
      addApprovedOrders(planId, orderIds),
    errorTitle: "Pesanan tidak dapat dijadwalkan",
    success: (count) => ({ title: `${count} pesanan masuk ke rencana` }),
  });

  const printMutation = useDeskMutation({
    mutationFn: (planId: string) => printRouteSheet(planId),
    errorTitle: "Cetak lembar rute gagal",
  });

  const selectedPlan = planList.data?.find((p) => p.id === selectedPlanId);

  return {
    planList: planList.data ?? [],
    planDetail: planDetail.data ?? [],
    selectedPlan,
    isLoadingList: planList.isLoading,
    isLoadingDetail: planDetail.isLoading,
    isError: planList.isError,
    error: planList.error as Error | null,
    selectedPlanId,
    setSelectedPlanId,
    pangkalanOptions: pangkalanOptions.data ?? [],
    driverOptions: driverOptions.data ?? [],
    saOptions: saOptions.data ?? [],
    saveDraftMutation,
    confirmPlanMutation,
    createPlanMutation,
    cancelPlanMutation,
    addOrdersMutation,
    printMutation,
  };
}
