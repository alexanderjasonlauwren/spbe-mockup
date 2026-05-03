import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
  dateRange: { from: string; to: string };
  onChange: (range: { from: string; to: string }) => void;
}

export function DateRangeFilter({ dateRange, onChange }: DateRangeFilterProps) {
  const setToday = () => {
    const today = new Date().toISOString().split("T")[0];
    onChange({ from: today, to: today });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={setToday}
        className="px-4 py-2 text-xs font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-colors"
      >
        Hari Ini
      </button>

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-on-surface-variant" />
        <input
          type="date"
          value={dateRange.from}
          onChange={(e) => onChange({ ...dateRange, from: e.target.value })}
          className="text-xs border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest outline-none focus:border-[#1565C0]"
        />
        <span className="text-xs text-on-surface-variant">—</span>
        <input
          type="date"
          value={dateRange.to}
          onChange={(e) => onChange({ ...dateRange, to: e.target.value })}
          className="text-xs border border-outline-variant rounded-lg px-3 py-2 bg-surface-container-lowest outline-none focus:border-[#1565C0]"
        />
      </div>
    </div>
  );
}
