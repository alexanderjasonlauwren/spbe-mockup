import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlanList,
  getPlanDetail,
  saveDraft,
  confirmPlan,
} from "../api/distributionApi";
import type { PlanRow } from "../types";

export function useDistributionPlan() {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    "plan-001",
  );

  const planList = useQuery({
    queryKey: ["plan-list"],
    queryFn: getPlanList,
  });

  const planDetail = useQuery({
    queryKey: ["plan-detail", selectedPlanId],
    queryFn: () => getPlanDetail(selectedPlanId!),
    enabled: !!selectedPlanId,
  });

  const saveDraftMutation = useMutation({
    mutationFn: ({ planId, rows }: { planId: string; rows: PlanRow[] }) =>
      saveDraft(planId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-list"] });
    },
  });

  const confirmPlanMutation = useMutation({
    mutationFn: (planId: string) => confirmPlan(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan-list"] });
    },
  });

  return {
    planList: planList.data ?? [],
    planDetail: planDetail.data ?? [],
    isLoadingList: planList.isLoading,
    isLoadingDetail: planDetail.isLoading,
    selectedPlanId,
    setSelectedPlanId,
    saveDraftMutation,
    confirmPlanMutation,
  };
}
