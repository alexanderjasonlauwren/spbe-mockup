import { useMemo, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

type DateInputElement = HTMLInputElement & {
  showPicker?: () => void;
};

export function ModernDatePicker({
  value,
  onChange,
  className,
}: ModernDatePickerProps) {
  const inputRef = useRef<DateInputElement>(null);

  const formattedDate = useMemo(() => {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(parsed);
  }, [value]);

  const openPicker = () => {
    if (!inputRef.current) {
      return;
    }

    if (typeof inputRef.current.showPicker === "function") {
      inputRef.current.showPicker();
      return;
    }

    inputRef.current.focus();
    inputRef.current.click();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={openPicker}
        className="group flex h-11 min-w-52 items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 text-sm font-medium text-gray-900 shadow-sm transition-all hover:border-cyan-400 hover:bg-cyan-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-dark-600 dark:bg-dark-900 dark:text-white dark:hover:border-cyan-500/60 dark:hover:bg-cyan-500/10"
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-gray-500 transition-colors group-hover:text-cyan-600 dark:text-gray-400 dark:group-hover:text-cyan-400" />
          {formattedDate}
        </span>
      </button>

      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        aria-label="Pilih tanggal"
      />
    </div>
  );
}
