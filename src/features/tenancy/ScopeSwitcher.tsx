import { useEffect, useRef, useState } from "react";
import { Building2, Check, ChevronDown, Layers, Network } from "lucide-react";
import { useScope } from "./useScope";
import { businessTypeLabel } from "./businessType";
import { cn } from "@/lib/utils";

/**
 * Current tenant and branch, and how to change either.
 *
 * Deliberately prominent: verifying a payment or confirming a dispatch in the
 * wrong scope is the expensive mistake this control exists to prevent, so the
 * active scope is always on screen rather than hidden in a menu. That argument
 * only got stronger with a tenant tree — the wrong branch is one depot, the
 * wrong tenant is a different company's books.
 *
 * Was BranchSwitcher. Extended rather than replaced: it already handled the
 * consolidated "Semua" mode, which is the same idea one level up.
 */
export function ScopeSwitcher() {
  const {
    branches, branch, branchId, isConsolidated, canSeeAll, setBranch,
    tenant, tenants, canSwitchTenant, setTenant,
  } = useScope();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Nothing to switch between at either level: state the scope without
  // offering a choice.
  if (branches.length <= 1 && !canSeeAll && !canSwitchTenant) {
    return (
      <span className="hidden items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs text-ink-muted sm:flex">
        <Building2 className="h-3.5 w-3.5" />
        {branch?.nama ?? "—"}
      </span>
    );
  }

  // Indentation is RELATIVE. `level` counts from the root, so rendering it
  // directly would indent a subsidiary's own subtree off the left edge of a
  // 16rem panel. Subtracting the acting tenant's level makes the tree read the
  // same wherever in it you happen to be standing.
  const baseLevel = tenant?.level ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Ganti cabang"
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
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
        {/* On phones the branch code carries the scope in ~82px instead of
            ~146px. It stays on screen either way: acting in the wrong cabang is
            the mistake this control exists to prevent, so it is never hidden. */}
        <span className="sm:hidden">
          {isConsolidated ? "Semua" : (branch?.kode ?? "—")}
        </span>
        <span className="hidden max-w-[12rem] truncate sm:inline">
          {/* Tenant first, because it is the coarser mistake. Only shown when
              there is more than one — a single-tenant install should not carry
              a permanent reminder of a hierarchy it does not have. */}
          {canSwitchTenant && tenant ? `${tenant.nama} · ` : ""}
          {isConsolidated ? "Semua cabang" : (branch?.nama ?? "Pilih cabang")}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="animate-in-up absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-md border border-line bg-panel shadow-pop">
          {canSwitchTenant && (
            <>
              <p className="label border-b border-line px-4 py-2 text-2xs text-ink-muted">
                Tenant
              </p>
              <ul className="max-h-56 overflow-y-auto border-b border-line">
                {tenants.map((t) => {
                  const active = t.id === tenant?.id;
                  const indent = Math.max(0, t.level - baseLevel);
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => {
                          setTenant(t.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-panel-sunk",
                          active && "bg-panel-sunk",
                        )}
                        style={{ paddingLeft: `${1 + indent * 0.875}rem` }}
                      >
                        <Network className="h-4 w-4 shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {t.nama}
                          </span>
                          <span className="block truncate text-2xs text-ink-muted">
                            {/* A holding runs no operations, so say so rather
                                than showing an industry it does not have. */}
                            {t.jenis === "grup" ? "Grup" : businessTypeLabel(t.jenisUsaha)}
                          </span>
                        </span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0 text-ink" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

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
