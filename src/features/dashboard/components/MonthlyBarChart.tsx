import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyChartPoint } from "../types";

interface MonthlyBarChartProps {
  data: MonthlyChartPoint[];
}

interface TooltipPayload {
  value: number;
  name: string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-lg p-3 shadow-lg text-xs">
      <p className="font-bold text-on-surface mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value.toLocaleString("id-ID")} tabung
        </p>
      ))}
    </div>
  );
}

export function MonthlyBarChart({ data }: MonthlyBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f2f4f7"
          vertical={false}
        />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 10, fontWeight: 700, fill: "#424752" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#424752" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
        />
        <Bar
          dataKey="target"
          name="Target"
          fill="#90CAF9"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="realisasi"
          name="Realisasi"
          fill="#1565C0"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
