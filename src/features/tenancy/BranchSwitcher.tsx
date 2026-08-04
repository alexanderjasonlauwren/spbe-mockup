import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Layers } from "lucide-react";
import { useScope } from "./useScope";
import { cn } from "@/lib/utils";

/**
 * Current branch, and how to change it.
 *
 * Deliberately prominent: verifying a payment or confirming a dispatch in the
 * wrong branch is the expensive mistake this control exists to prevent, so the
 * active scope is always on screen rather than hidden in a menu.
 */
export function BranchSwitcher() {
  const { branches, branch, branchId, isConsolidated, canSeeAll, setBranch } = useScope();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Nothing to switch between: state the scope without offering a choice.
  if (branches.length <= 1 && !canSeeAll) {
    return (
      <span className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-muted sm:flex">
        <Building2 className="h-3.5 w-3.5" />
        {branch?.nama ?? "—"}
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ganti cabang"
        className={cn(
          "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
          isConsolidated
            ? "border-signal bg-signal-soft text-signal-ink"
            : "border-line text-ink hover:border-line-strong",
        )}
      >
        {isConsolidated ? (
          <Layers className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Building2 className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="max-w-[9rem] truncate">
          {isConsolidated ? "Semua cabang" : (branch?.nama ?? "Pilih cabang")}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="animate-in-up absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-md border border-line bg-panel shadow-pop">
          <p className="label border-b border-line px-4 py-2 text-2xs text-ink-muted">
            Cabang
          </p>

          {canSeeAll && (
            <button
              onClick={() => {
                setBranch(null);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 border-b border-line px-4 py-2.5 text-left transition-colors hover:bg-panel-sunk",
                isConsolidated && "bg-panel-sunk",
              )}
            >
              <Layers className="h-4 w-4 shrink-0 text-ink-muted" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">Semua cabang</span>
                <span className="block text-2xs text-ink-muted">
                  Angka gabungan seluruh cabang
                </span>
              </span>
              {isConsolidated && <Check className="h-3.5 w-3.5 shrink-0 text-ink" />}
            </button>
          )}

          <ul className="max-h-72 overflow-y-auto">
            {branches.map((b) => {
              const active = b.id === branchId;
              return (
                <li key={b.id}>
                  <button
                    onClick={() => {
                      setBranch(b.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-panel-sunk",
                      active && "bg-panel-sunk",
                    )}
                  >
                    <span className="data w-9 shrink-0 rounded-sm bg-panel-raised px-1.5 py-0.5 text-center text-2xs text-ink-muted">
                      {b.kode}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {b.nama}
                      </span>
                      <span className="block truncate text-2xs text-ink-muted">
                        {b.kota}
                      </span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-ink" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
