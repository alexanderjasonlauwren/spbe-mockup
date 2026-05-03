import { DataTable } from "@/components/common/DataTable";
import { InlineProgress } from "@/components/common/InlineProgress";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import type { MonitoringRow } from "../types";
import type { Column } from "@/components/common/DataTable";

interface MonitoringTableProps {
  data: MonitoringRow[];
  isLoading: boolean;
}

const columns: Column<MonitoringRow>[] = [
  {
    key: "pangkalan",
    header: "Pangkalan",
    render: (row) => (
      <div>
        <p className="text-sm font-bold text-on-surface">{row.pangkalan}</p>
        <p className="text-xs text-on-surface-variant">{row.alamat}</p>
      </div>
    ),
  },
  {
    key: "target",
    header: "Target (Tabung)",
    align: "right",
    render: (row) => (
      <span className="text-sm">{row.target.toLocaleString("id-ID")}</span>
    ),
  },
  {
    key: "realisasi",
    header: "Realisasi",
    align: "right",
    render: (row) => (
      <span className="text-sm font-bold">
        {row.realisasi.toLocaleString("id-ID")}
      </span>
    ),
  },
  {
    key: "selisih",
    header: "Selisih",
    align: "right",
    render: (row) => {
      const delta = row.realisasi - row.target;
      return (
        <span
          className={
            "text-sm font-bold " +
            (delta < 0
              ? "text-red-600"
              : delta > 0
                ? "text-emerald-600"
                : "text-on-surface-variant")
          }
        >
          {delta > 0 ? "+" : ""}
          {delta.toLocaleString("id-ID")}
        </span>
      );
    },
  },
  {
    key: "pencapaianPersen",
    header: "Pencapaian",
    render: (row) => (
      <div className="min-w-[120px]">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-on-surface-variant">
            {row.pencapaianPersen.toFixed(1)}%
          </span>
        </div>
        <InlineProgress value={row.pencapaianPersen} colorAuto />
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge variant={getStatusVariant(row.status)} label={row.status} />
    ),
  },
];

export function MonitoringTable({ data, isLoading }: MonitoringTableProps) {
  return (
    <DataTable
      columns={columns}
      data={data}
      isLoading={isLoading}
      emptyMessage="Belum ada data monitoring untuk periode ini"
    />
  );
}
