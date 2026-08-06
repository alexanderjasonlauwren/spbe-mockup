import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { fleetColor } from "@/lib/chart";
import { useTheme } from "@/hooks/useTheme";
import { formatNumber } from "@/lib/format";
import { buildRoundSequence } from "../lib/roundSequence";
import type { DriverCard, MonitoringAssignment, MonitoringRow } from "../types";

interface RoundStopListProps {
  rows: MonitoringRow[];
  drivers: DriverCard[];
  assignments: MonitoringAssignment[];
  focusedDriverId: string | null;
}

/**
 * The focused round, read as a list.
 *
 * A route drawn on a map answers "where"; it is poor at "in what order, and how
 * far through". This column carries the sequence as text next to the line that
 * draws it — and it earns its place twice over, because taking it out of the
 * map's width is what lets the map be tall enough to zoom in at all.
 */
export function RoundStopList({
  rows,
  drivers,
  assignments,
  focusedDriverId,
}: RoundStopListProps) {
  const { isDark } = useTheme();

  const driver = drivers.find((d) => d.id === focusedDriverId) ?? null;
  const assignment = assignments.find((a) => a.driverId === focusedDriverId);

  const sequence = useMemo(
    () => buildRoundSequence(rows, focusedDriverId, assignment?.pangkalanId),
    [rows, focusedDriverId, assignment?.pangkalanId],
  );

  if (!driver || sequence.stops.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line-strong bg-panel-sunk px-5 py-10 text-center">
        <MapPin className="h-5 w-5 text-draft" aria-hidden />
        <p className="text-sm font-medium text-ink">Belum ada armada dipilih</p>
        <p className="text-xs text-ink-muted">
          Pilih satu kartu armada untuk melihat urutan pemberhentiannya.
        </p>
      </div>
    );
  }

  const color = fleetColor(driver.slot, isDark);
  const total = sequence.stops.length;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: color }}
            aria-hidden
          />
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {driver.name}
          </p>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          <span className="data">{sequence.doneCount}</span> dari{" "}
          <span className="data">{total}</span> pemberhentian selesai
          {!sequence.isSingleRound && " · beberapa rute"}
        </p>
        {/* Progress as a bar, because "8 of 12" is a number you read and a bar
            is a thing you see. */}
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-panel-sunk">
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{
              width: `${total ? (sequence.doneCount / total) * 100 : 0}%`,
              background: color,
            }}
          />
        </div>
      </div>

      <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {sequence.stops.map((stop) => (
          <li
            key={stop.row.id}
            className={cn(
              "flex items-start gap-3 px-4 py-2.5",
              stop.state === "next" && "bg-signal-soft",
            )}
          >
            <span
              className={cn(
                "data mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-bold",
                stop.state === "done"
                  ? "text-white"
                  : stop.state === "next"
                    ? "text-white"
                    : "border text-ink-muted",
              )}
              style={
                stop.state === "done"
                  ? { background: color, opacity: 0.5 }
                  : stop.state === "next"
                    ? { background: color }
                    : { borderColor: color }
              }
              aria-hidden
            >
              {stop.state === "done" ? "✓" : sequence.numbered ? stop.order : ""}
            </span>

            <span className="min-w-0 flex-1">
              <Link
                to={`/pangkalan/${stop.pangkalanId}`}
                className="block truncate text-xs font-semibold text-ink hover:underline hover:decoration-signal hover:decoration-2 hover:underline-offset-4"
              >
                {stop.row.pangkalan}
              </Link>
              <span className="data mt-0.5 block text-2xs text-ink-muted">
                {stop.row.jamRencana} · {formatNumber(stop.row.realisasi)}/
                {formatNumber(stop.row.target)}
              </span>
            </span>

            {stop.state === "next" && (
              <span className="label shrink-0 rounded-sm bg-signal px-1.5 py-0.5 text-[0.5625rem] text-[rgb(23_26_22)]">
                Tujuan
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
