import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KpiVariant = "blue" | "amber" | "green" | "red";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle: string;
  progressValue?: number;
  icon: LucideIcon;
  variant?: KpiVariant;
  showWarning?: boolean;
}

const iconColors: Record<KpiVariant, string> = {
  blue: "text-[#1565C0]",
  amber: "text-amber-600",
  green: "text-green-600",
  red: "text-red-600",
};

const progressColors: Record<KpiVariant, string> = {
  blue: "bg-[#1565C0]",
  amber: "bg-amber-500",
  green: "bg-green-500",
  red: "bg-red-500",
};

export function KpiCard({
  title,
  value,
  subtitle,
  progressValue,
  icon: Icon,
  variant = "blue",
  showWarning = false,
}: KpiCardProps) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <p className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
          {title}
        </p>
        <Icon className={cn("h-5 w-5", iconColors[variant])} />
      </div>
      <p className="text-3xl font-black text-on-surface tracking-tighter">
        {value}
      </p>
      {progressValue !== undefined && (
        <div className="w-full bg-surface-container-low h-1.5 rounded-full">
          <div
            className={cn("h-full rounded-full", progressColors[variant])}
            style={{ width: `${Math.min(100, progressValue)}%` }}
          />
        </div>
      )}
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-bold",
          showWarning ? "text-red-600" : "text-on-surface-variant",
        )}
      >
        {subtitle}
      </div>
    </div>
  );
}
