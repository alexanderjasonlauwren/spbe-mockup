import { CalendarPlus } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import { Skeleton } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateId, formatNumber } from "@/lib/format";
import type { DistributionPlan } from "../types";
import { outletLabel, unitLabel } from "@/lib/lexicon";

interface PlanListPanelProps {
  plans: DistributionPlan[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}

export function PlanListPanel({
  plans,
  isLoading,
  selectedId,
  onSelect,
  onCreate,
}: PlanListPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-panel">
      <div className="border-b border-line p-3">
        <Button onClick={onCreate} className="w-full">
          <CalendarPlus className="h-4 w-4" />
          Rencana baru
        </Button>
      </div>

      <div className="flex-1 divide-y divide-line overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : plans.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title="Belum ada rencana"
            description={`Buat rencana untuk tanggal pengiriman, lalu tambahkan ${outletLabel()} dan armada.`}
          />
        ) : (
          plans.map((plan) => {
            const active = selectedId === plan.id;
            return (
              <button
                key={plan.id}
                onClick={() => onSelect(plan.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "spine w-full p-4 text-left transition-colors",
                  spineFor(plan.status),
                  active ? "bg-panel-raised" : "hover:bg-panel-sunk",
                )}
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "text-sm text-ink",
                      active ? "font-semibold" : "font-medium",
                    )}
                  >
                    {formatDateId(plan.tanggal)}
                  </span>
                  <StatusBadge
                    variant={getStatusVariant(plan.status)}
                    label={plan.status}
                  />
                </div>
                <p className="data text-2xs text-ink-muted">{plan.kode}</p>
                <p className="mt-1 text-xs text-ink-muted">
                  <span className="data">{formatNumber(plan.totalUnit)}</span> {unitLabel()} ·{" "}
                  {plan.jumlahOutlet} {outletLabel()} · {plan.jumlahDriver} armada
                </p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
