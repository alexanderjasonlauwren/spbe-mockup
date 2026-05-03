import { useDistributionPlan } from "@/features/distribution/hooks/useDistributionPlan";
import { PlanListPanel } from "@/features/distribution/components/PlanListPanel";
import { PlanDetailPanel } from "@/features/distribution/components/PlanDetailPanel";
import type { PlanRow } from "@/features/distribution/types";

export function DistributionPage() {
  const {
    planList,
    planDetail,
    isLoadingList,
    isLoadingDetail,
    selectedPlanId,
    setSelectedPlanId,
    saveDraftMutation,
    confirmPlanMutation,
  } = useDistributionPlan();

  const selectedPlan = planList.find((p) => p.id === selectedPlanId) ?? null;

  const handleSaveDraft = (rows: PlanRow[]) => {
    if (selectedPlanId) {
      saveDraftMutation.mutate({ planId: selectedPlanId, rows });
    }
  };

  const handleConfirm = () => {
    if (selectedPlanId) {
      confirmPlanMutation.mutate(selectedPlanId);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-on-surface">Perencanaan Distribusi</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Plan List */}
        <div className="lg:col-span-3">
          <PlanListPanel
            plans={planList}
            isLoading={isLoadingList}
            selectedId={selectedPlanId}
            onSelect={setSelectedPlanId}
          />
        </div>

        {/* Plan Detail */}
        <div className="lg:col-span-9">
          <PlanDetailPanel
            plan={selectedPlan}
            rows={planDetail}
            isLoading={isLoadingDetail}
            onSaveDraft={handleSaveDraft}
            onConfirm={handleConfirm}
            isSaving={saveDraftMutation.isPending}
            isConfirming={confirmPlanMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
