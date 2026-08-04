import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The surface every page is built from. Panels sit on hairlines rather than
 * shadows — the desk is flat, only genuinely floating things (menus, dialogs,
 * toasts) cast a shadow.
 */
export function Panel({
  className,
  children,
  spine,
  ...props
}: React.ComponentProps<"section"> & { spine?: string }) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-md border border-line bg-panel",
        spine && `spine ${spine}`,
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  hint,
  actions,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="label text-2xs text-ink-muted">{title}</h2>
        {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PanelBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

/**
 * A labelled figure. The value is always mono — it is a number you read digit
 * by digit — and the label is always the narrow utility face.
 */
export function Figure({
  label,
  value,
  unit,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="label text-2xs text-ink-muted">{label}</p>
      <p className="data mt-1 text-figure font-semibold text-ink">
        {value}
        {unit && (
          <span className="ml-1.5 font-sans text-sm font-medium tracking-normal text-ink-muted">
            {unit}
          </span>
        )}
      </p>
      {hint && <div className="mt-1 text-xs text-ink-muted">{hint}</div>}
    </div>
  );
}

/** Horizontal quota/target bar. Amber marks progress; the track is the desk. */
export function Meter({
  value,
  max,
  tone = "signal",
  className,
  label,
}: {
  value: number;
  max: number;
  tone?: "signal" | "pine" | "rust" | "ink";
  className?: string;
  label?: string;
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const fill = {
    signal: "bg-signal",
    pine: "bg-pine",
    rust: "bg-rust",
    ink: "bg-ink",
  }[tone];

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-panel-raised", className)}
      role="meter"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-desk", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Loading placeholder shaped like the content it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-panel-raised", className)}
      aria-hidden
    />
  );
}
