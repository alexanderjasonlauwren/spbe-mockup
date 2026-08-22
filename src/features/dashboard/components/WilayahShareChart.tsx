import { Skeleton } from "@/components/common/Panel";
import { formatNumber } from "@/lib/format";
import type { OutletShare } from "../types";
import { unitLabel } from "@/lib/lexicon";

/**
 * Share of the month's tonnage by kecamatan.
 *
 * A ranked bar rather than a donut: the question people actually ask here is
 * "which areas are we serving most", and rank plus length answers that far
 * faster than comparing wedge angles. One measure, one hue, values labelled
 * directly so nothing depends on reading a legend.
 */
export function WilayahShareChart({
  data,
  isLoading,
}: {
  data: OutletShare[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        Belum ada realisasi bulan ini. Angka muncul setelah surat jalan pertama
        diselesaikan.
      </p>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between border-b border-line pb-3">
        <span className="label text-2xs text-ink-muted">Total bulan ini</span>
        <span className="data text-lg font-semibold text-ink">
          {formatNumber(total)}
          <span className="ml-1 font-sans text-xs font-medium tracking-normal text-ink-muted">
            {unitLabel()}
          </span>
        </span>
      </div>

      <ul className="space-y-3.5">
        {data.map((d) => (
          <li key={d.name}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink">{d.name}</span>
              <span className="data shrink-0 text-xs text-ink-muted">
                {formatNumber(d.value)}
                <span className="ml-1.5 font-semibold text-ink">{d.percentage}%</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel-raised">
              <div
                className="h-full rounded-full bg-[#2A6FB0] transition-[width] duration-500 ease-desk dark:bg-[#4E90CE]"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
