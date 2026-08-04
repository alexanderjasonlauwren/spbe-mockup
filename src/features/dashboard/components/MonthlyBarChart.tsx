import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/hooks/useTheme";
import { axisProps, chartTheme, compactTabung, seriesColor } from "@/lib/chart";
import { ChartTooltip } from "@/components/common/ChartTooltip";
import type { MonthlyChartPoint } from "../types";

/**
 * Realisation against target, week by week. Both series are the same measure
 * on one scale, so they share an axis — target sits behind as the recessive
 * reference and realisation carries the colour.
 */
export function MonthlyBarChart({ data }: { data: MonthlyChartPoint[] }) {
  const { isDark } = useTheme();
  const t = chartTheme(isDark);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={t.grid} vertical={false} />
        <XAxis dataKey="week" {...axisProps(isDark)} />
        <YAxis {...axisProps(isDark)} tickFormatter={compactTabung} width={58} />
        <Tooltip
          cursor={{ fill: t.grid, fillOpacity: 0.45 }}
          content={<ChartTooltip unit="tabung" />}
        />
        <Legend
          iconType="square"
          iconSize={9}
          wrapperStyle={{
            fontSize: "11px",
            paddingTop: "10px",
            color: t.muted,
          }}
        />
        <Bar
          dataKey="target"
          name="Target"
          fill={t.reference}
          radius={[3, 3, 0, 0]}
          maxBarSize={26}
        />
        <Bar
          dataKey="realisasi"
          name="Realisasi"
          fill={seriesColor(0, isDark)}
          radius={[3, 3, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
