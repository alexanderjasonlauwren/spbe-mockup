import { TextInput } from "@/components/common/Field";
import { Button } from "@/components/ui/button";

function isoDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function DateRangeFilter({
  dateRange,
  onChange,
}: {
  dateRange: { from: string; to: string };
  onChange: (range: { from: string; to: string }) => void;
}) {
  const today = isoDay();
  const isToday = dateRange.from === today && dateRange.to === today;
  const isWeek = dateRange.from === isoDay(-6) && dateRange.to === today;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant={isToday ? "default" : "outline"}
        onClick={() => onChange({ from: today, to: today })}
      >
        Hari ini
      </Button>
      <Button
        size="sm"
        variant={isWeek ? "default" : "outline"}
        onClick={() => onChange({ from: isoDay(-6), to: today })}
      >
        7 hari
      </Button>

      <div className="flex items-center gap-2">
        <TextInput
          type="date"
          mono
          aria-label="Tanggal mulai"
          className="w-auto py-1.5 text-xs"
          value={dateRange.from}
          max={dateRange.to}
          onChange={(e) => onChange({ ...dateRange, from: e.target.value })}
        />
        <span className="text-xs text-ink-muted">–</span>
        <TextInput
          type="date"
          mono
          aria-label="Tanggal akhir"
          className="w-auto py-1.5 text-xs"
          value={dateRange.to}
          min={dateRange.from}
          onChange={(e) => onChange({ ...dateRange, to: e.target.value })}
        />
      </div>
    </div>
  );
}
