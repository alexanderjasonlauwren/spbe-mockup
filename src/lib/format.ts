/**
 * Display formatting.
 *
 * The console is Indonesian and number-heavy, so everything here produces
 * id-ID output and, where it is a figure you read digit by digit, is meant to
 * be rendered in the mono face (`className="data"`).
 */

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function formatNumber(value: number): string {
  return value.toLocaleString("id-ID");
}

/** "1.284 tabung" — the unit stays in the sans face at the call site. */
export function formatTabung(value: number): string {
  return `${formatNumber(value)}`;
}

export function formatRupiah(value: number): string {
  return `Rp ${formatNumber(Math.round(value))}`;
}

/** Compact money for tight spaces: Rp 1,8 jt / Rp 240 rb. */
export function formatRupiahShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000)
    return `Rp ${(value / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000)
    return `Rp ${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000)
    return `Rp ${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
  return formatRupiah(value);
}

/** "4 Agu 2026" */
export function formatDateId(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Selasa, 4 Agustus 2026" */
export function formatDateLong(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "4 Agu, 14:30" */
export function formatDateTimeId(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** "baru saja", "12 mnt lalu", "3 jam lalu", then falls back to a date. */
export function relativeTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const minutes = Math.round(diff / 60_000);

  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days === 1) return "kemarin";
  if (days < 7) return `${days} hari lalu`;
  return formatDateId(d);
}

/** Minutes from midnight → "07:30". */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatPercentId(value: number, digits = 0): string {
  return `${value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;
}

/** Signed delta for day-on-day comparisons: "+12%" / "−4%". */
export function formatDelta(current: number, previous: number): {
  label: string;
  tone: "up" | "down" | "flat";
} {
  // Before the first truck reports in there is nothing to compare — saying
  // "−100%" would read as a collapse rather than an empty morning.
  if (current === 0) return { label: "belum ada realisasi", tone: "flat" };
  if (previous === 0) return { label: "belum ada pembanding", tone: "flat" };
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) return { label: "sama dengan kemarin", tone: "flat" };
  return {
    label: `${pct > 0 ? "+" : "−"}${Math.abs(pct).toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    })}% vs kemarin`,
    tone: pct > 0 ? "up" : "down",
  };
}
