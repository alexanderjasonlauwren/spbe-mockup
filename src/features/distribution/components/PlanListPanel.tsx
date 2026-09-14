import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { getStatusVariant, spineFor } from "@/lib/status";
import { Skeleton } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  const [hideCancelled, setHideCancelled] = useState(true);
  const visiblePlans = hideCancelled
    ? plans.filter((plan) => plan.status !== "Batal")
    : plans;
  const cancelledCount = plans.length - plans.filter((p) => p.status !== "Batal").length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-panel">
      <div className="space-y-3 border-b border-line p-3">
        <Button onClick={onCreate} className="w-full">
          <CalendarPlus className="h-4 w-4" />
          Rencana baru
        </Button>

        {cancelledCount > 0 && (
          <Label htmlFor="hide-cancelled" className="justify-start text-xs font-normal text-ink-muted">
            <Checkbox
              id="hide-cancelled"
              checked={hideCancelled}
              onCheckedChange={(checked) => setHideCancelled(checked === true)}
            />
            Sembunyikan yang dibatalkan ({cancelledCount})
          </Label>
        )}
      </div>

      <div className="flex-1 divide-y divide-line overflow-y-auto">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2 p-4">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : visiblePlans.length === 0 ? (
          <EmptyState
            icon={CalendarPlus}
            title={plans.length === 0 ? "Belum ada rencana" : "Semua rencana dibatalkan"}
            description={
              plans.length === 0
                ? `Buat rencana untuk tanggal pengiriman, lalu tambahkan ${outletLabel()} dan armada.`
                : "Tampilkan yang dibatalkan untuk melihatnya kembali."
            }
          />
        ) : (
          visiblePlans.map((plan) => {
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
