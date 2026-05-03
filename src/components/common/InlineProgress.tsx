import { cn } from "@/lib/utils";

interface InlineProgressProps {
  value: number;
  showLabel?: boolean;
  colorAuto?: boolean;
  className?: string;
}

export function InlineProgress({
  value,
  showLabel = false,
  colorAuto = false,
  className,
}: InlineProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));

  const barColor = colorAuto
    ? clamped > 50
      ? "bg-green-500"
      : clamped >= 20
        ? "bg-amber-500"
        : "bg-red-500"
    : "bg-[#1565C0]";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor,
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-on-surface-variant w-9 text-right shrink-0">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
