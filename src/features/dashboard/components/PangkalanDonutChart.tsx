import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PangkalanShare } from "../types";

interface PangkalanDonutChartProps {
  data: PangkalanShare[];
}

const COLORS = ["#004d99", "#1565C0", "#813900", "#00838F", "#6A1B9A"];

export function PangkalanDonutChart({ data }: PangkalanDonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-44 h-44 mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={72}
              dataKey="value"
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                `${value.toLocaleString("id-ID")} tabung`,
                "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-on-surface">
            {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total}
          </span>
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
            Total
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {data.map((d, idx) => (
          <div key={d.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
            />
            <span className="text-xs font-medium text-on-surface truncate">
              {d.name} ({d.percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
