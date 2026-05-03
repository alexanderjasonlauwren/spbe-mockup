import { cn } from "@/lib/utils";
import type { NotificationType } from "../types";

type FilterType = "Semua" | NotificationType;

interface NotificationFilterChipsProps {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

const filters: FilterType[] = ["Semua", "Pengingat", "Alert", "Sistem"];

const filterColors: Record<FilterType, string> = {
  Semua: "bg-[#1565C0] text-white",
  Pengingat: "bg-blue-100 text-blue-700",
  Alert: "bg-red-100 text-red-700",
  Sistem: "bg-slate-100 text-slate-700",
};

const inactiveColors: Record<FilterType, string> = {
  Semua: "bg-slate-100 text-on-surface-variant hover:bg-slate-200",
  Pengingat:
    "bg-slate-100 text-on-surface-variant hover:bg-blue-50 hover:text-blue-700",
  Alert:
    "bg-slate-100 text-on-surface-variant hover:bg-red-50 hover:text-red-700",
  Sistem: "bg-slate-100 text-on-surface-variant hover:bg-slate-200",
};

export function NotificationFilterChips({
  activeFilter,
  onChange,
  counts,
}: NotificationFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
            activeFilter === f ? filterColors[f] : inactiveColors[f],
          )}
        >
          {f}
          {counts[f] > 0 && (
            <span
              className={cn(
                "w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center",
                activeFilter === f
                  ? "bg-white/30 text-white"
                  : "bg-white text-on-surface-variant",
              )}
            >
              {counts[f]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
