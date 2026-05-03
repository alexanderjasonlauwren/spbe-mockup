import { Plus } from "lucide-react";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import type { DistributionPlan } from "../types";

interface PlanListPanelProps {
  plans: DistributionPlan[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PlanListPanel({
  plans,
  isLoading,
  selectedId,
  onSelect,
}: PlanListPanelProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-slate-50">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-all">
          <Plus className="h-4 w-4" />
          Buat Rencana Baru
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="h-4 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-3/4" />
              </div>
            ))
          : plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => onSelect(plan.id)}
                className={cn(
                  "w-full text-left p-4 hover:bg-slate-50 transition-colors",
                  selectedId === plan.id &&
                    "border-l-4 border-[#1565C0] bg-blue-50/40",
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-on-surface">
                    {plan.tanggal}
                  </p>
                  <StatusBadge
                    variant={getStatusVariant(plan.status)}
                    label={plan.status}
                  />
                </div>
                <p className="text-xs text-on-surface-variant">
                  {plan.totalTabung.toLocaleString("id-ID")} tabung •{" "}
                  {plan.jumlahPangkalan} pangkalan
                </p>
              </button>
            ))}
      </div>
    </div>
  );
}
