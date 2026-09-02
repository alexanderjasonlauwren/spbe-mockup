import { scopeKey } from "@/mocks/scope";
import { useQuery } from "@tanstack/react-query";
import { useDeskMutation } from "@/hooks/useDeskMutation";
import {
  addApprovedOrders,
  cancelDistributionPlan,
  confirmPlan,
  createPlan,
  getActiveSaOptions,
  getDriverOptions,
  getOutletOptions,
  getProductOptions,
  getPlan,
  getPlanDetail,
  getPlanList,
  printRouteSheet,
  saveDraft,
} from "../api/distributionApi";
import type { PlanRow } from "../types";
import { outletLabel, unitLabel } from "@/lib/lexicon";
import { useResettableState } from "@/hooks/useResettableState";

export function useDistributionPlan() {
  const planList = useQuery({ queryKey: [...scopeKey(), "plan-list"], queryFn: getPlanList });

  // Open on the plan that needs attention: today's, or the newest draft.
  //
  // Chosen during render rather than in an effect, so the first paint already
  // has a plan selected. Via an effect the panel rendered once with nothing
  // selected, which flashed the empty state on every load.
  //
  // The list is the only dependency: an explicit selection survives a refetch
  // because setSelectedPlanId replaces the value without disturbing the seed,
  // and only a genuinely new list re-runs the choice.
  const [selectedPlanId, setSelectedPlanId] = useResettableState<string | null>(
    [planList.data],
    () => {
      const plans = planList.data;
      if (!plans?.length) return null;
      return (plans.find((p) => p.status === "Draft") ?? plans[0]).id;
    },
  );

  // The selected plan is read on its own rather than found in the list.
  //
  // A list row cannot carry which agreement the plan spends: the service
  // records that per stop, so it is only known once the stops have been
  // fetched. Finding the plan in the list left the panel showing "—" for the SA
  // on the API build while the mock showed the real one — the exact kind of
  // difference between the two builds this split exists to prevent.
  const selectedPlanQuery = useQuery({
    queryKey: [...scopeKey(), "plan", selectedPlanId],
    queryFn: () => getPlan(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const planDetail = useQuery({
    queryKey: [...scopeKey(), "plan-detail", selectedPlanId],
    queryFn: () => getPlanDetail(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const outletOptions = useQuery({
    queryKey: [...scopeKey(), "outlet-options"],
    queryFn: getOutletOptions,
  });

  const driverOptions = useQuery({
    queryKey: [...scopeKey(), "driver-options", selectedPlanId],
    queryFn: () => getDriverOptions(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const productOptions = useQuery({
    queryKey: [...scopeKey(), "product-options"],
    queryFn: getProductOptions,
  });

  const saOptions = useQuery({
    queryKey: [...scopeKey(), "active-sa-options"],
    queryFn: getActiveSaOptions,
  });

  // The version every write echoes back. Read from the plan the panel is
  // showing, never from a remembered value: the point of the guard is that it
  // is the number the caller actually saw.
  const version = () => selectedPlanQuery.data?.version ?? 1;

  const saveDraftMutation = useDeskMutation({
    mutationFn: ({ planId, rows }: { planId: string; rows: PlanRow[] }) =>
      saveDraft(planId, rows, version()),
    errorTitle: "Draf tidak tersimpan",
    success: "Draf disimpan",
  });

  const confirmPlanMutation = useDeskMutation({
    mutationFn: (planId: string) => confirmPlan(planId, version()),
    errorTitle: "Konfirmasi gagal",
    // What the confirmation actually committed, rather than how many delivery
    // notes it printed. The service confirms the obligation and leaves the
    // paperwork to dispatch, so a delivery count here would be a number only
    // the demo could fill.
    success: (plan) => ({
      title: `Rencana ${plan.kode} dikonfirmasi`,
      description: `${plan.jumlahOutlet} ${outletLabel()} · ${plan.totalUnit.toLocaleString("id-ID")} ${unitLabel()} terikat pada kuota SA. Pantau di Monitoring Distribusi.`,
    }),
  });

  const createPlanMutation = useDeskMutation({
    mutationFn: createPlan,
    errorTitle: "Rencana tidak dibuat",
    success: (plan) => ({
      title: `Rencana ${plan.kode} dibuat`,
      description: `Tambahkan ${outletLabel()} dan tetapkan driver sebelum konfirmasi.`,
    }),
    onDone: (plan) => setSelectedPlanId(plan.id),
  });

  const cancelPlanMutation = useDeskMutation({
    mutationFn: (planId: string) => cancelDistributionPlan(planId, version()),
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

  const selectedPlan = selectedPlanQuery.data;

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
    outletOptions: outletOptions.data ?? [],
    productOptions: productOptions.data ?? [],
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
