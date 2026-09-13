import type { ReactNode } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { Field } from "@/components/common/Field";
import { cn } from "@/lib/utils";

/**
 * A settings field that a tenant may inherit from its parent, or set for itself.
 *
 * # Why the distinction is on screen at all
 *
 * `iam.tenant_settings` inherits per COLUMN — an absent value means "not set
 * here, ask my parent" — so a subsidiary that renames only its lexicon still
 * follows its group's working week. Render only the effective value and that
 * disappears: every field looks equally chosen.
 *
 * That is not merely a missing label. A form showing resolved values and saving
 * them back writes an override for every field the tenant never touched, and the
 * parent can then never change any of them for that tenant again. The screen
 * looks unchanged the whole time, which is what makes it worth showing.
 *
 * So an inherited field is visibly inherited, editing it is a deliberate act,
 * and there is always a way back.
 */
export function InheritableField({
  label,
  htmlFor,
  hint,
  className,
  /** True when THIS tenant has set the field. */
  isOwn,
  /** The ancestor the value came from, when inherited. */
  inheritedFrom,
  /** Called when the user chooses to set this field for their own tenant. */
  onOverride,
  /** Called when the user returns the field to its parent's value. */
  onInherit,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  isOwn: boolean;
  inheritedFrom: { nama: string } | null;
  onOverride: () => void;
  onInherit: () => void;
  children: ReactNode;
}) {
  /**
   * Three states, not two.
   *
   * A field can be set here, inherited from a named ancestor, or set by nobody —
   * in which case the console's own default applies. Collapsing the third into
   * "set here" tells the user this tenant chose a value it never chose, and
   * collapsing it into "inherited" names an ancestor that has not set it either.
   */
  const state: "own" | "inherited" | "default" = isOwn
    ? "own"
    : inheritedFrom
      ? "inherited"
      : "default";
  const inherited = state !== "own";

  return (
    <Field
      label={label}
      htmlFor={htmlFor}
      hint={hint}
      className={className}
    >
      {/* The input stays interactive when inherited rather than being disabled.
          A disabled control reads as "you may not change this", which is wrong —
          the tenant may, it simply has not. Typing into it IS the override, and
          onOverride fires on the first edit. */}
      <div className={cn(inherited && "opacity-70 transition-opacity focus-within:opacity-100")}>
        {children}
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-2xs">
        {state === "inherited" ? (
          <>
            <span className="flex items-center gap-1 text-ink-muted">
              <Lock className="h-3 w-3 shrink-0" />
              Diwarisi dari {inheritedFrom!.nama}
            </span>
            <button
              type="button"
              onClick={onOverride}
              className="font-semibold text-ink underline-offset-2 hover:underline"
            >
              Ubah di sini
            </button>
          </>
        ) : state === "default" ? (
          <>
            <span className="text-ink-muted">Bawaan sistem</span>
            <button
              type="button"
              onClick={onOverride}
              className="font-semibold text-ink underline-offset-2 hover:underline"
            >
              Ubah di sini
            </button>
          </>
        ) : (
          <>
            <span className="text-ink-muted">• Diatur di sini</span>
            <button
              type="button"
              onClick={onInherit}
              className="flex items-center gap-1 font-semibold text-ink underline-offset-2 hover:underline"
            >
              <RotateCcw className="h-3 w-3 shrink-0" />
              Kembali ke warisan
            </button>
          </>
        )}
      </div>
    </Field>
  );
}
