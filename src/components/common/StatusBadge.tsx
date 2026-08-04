import { cn } from "@/lib/utils";
import type { StatusVariant } from "@/lib/status";

/**
 * A squared tag with a left spine rather than a pill — the same device as the
 * docket spine on table rows, so a status reads identically whether it appears
 * as a tag, a row edge, or a map pin.
 *
 * The status vocabulary itself lives in `@/lib/status`.
 */
const variantClasses: Record<StatusVariant, string> = {
  success: "bg-pine-soft text-pine-ink before:bg-pine",
  warning: "bg-signal-soft text-signal-ink before:bg-signal",
  process: "bg-signal-soft text-signal-ink before:bg-signal",
  danger: "bg-rust-soft text-rust-ink before:bg-rust",
  draft: "bg-draft-soft text-ink-muted before:bg-draft",
  info: "bg-panel-raised text-ink-muted before:bg-ink-muted",
};

export function StatusBadge({
  variant,
  label,
  className,
}: {
  variant: StatusVariant;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center whitespace-nowrap rounded-sm py-0.5 pl-2.5 pr-2 font-narrow text-2xs uppercase leading-4 tracking-[0.09em]",
        "before:absolute before:bottom-0 before:left-0 before:top-0 before:w-[2px] before:rounded-l-sm",
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
