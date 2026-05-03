import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  const id = `toggle-${label.replace(/\s/g, "-")}`;
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <label
          htmlFor={id}
          className="text-sm font-bold text-on-surface cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-on-surface-variant">{description}</p>
        )}
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors",
          checked ? "bg-[#1565C0]" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
