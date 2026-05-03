import { Download } from "lucide-react";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import type { RecentActivity } from "../types";

interface RecentActivityTableProps {
  data: RecentActivity[];
  isLoading: boolean;
}

const columns: Column<RecentActivity>[] = [
  {
    key: "id",
    header: "No",
    render: (row) => (
      <span className="font-medium text-on-surface">
        #{row.id.split("-")[1]}
      </span>
    ),
  },
  {
    key: "tanggal",
    header: "Tanggal",
    render: (row) => <span className="text-on-surface">{row.tanggal}</span>,
  },
  {
    key: "pangkalan",
    header: "Pangkalan",
    render: (row) => (
      <span className="font-bold text-on-surface">{row.pangkalan}</span>
    ),
  },
  {
    key: "driver",
    header: "Driver",
    render: (row) => <span className="text-on-surface">{row.driver}</span>,
  },
  {
    key: "jumlahTabung",
    header: "Jumlah Tabung",
    align: "right",
    render: (row) => (
      <span className="font-bold text-on-surface">
        {row.jumlahTabung.toLocaleString("id-ID")}
      </span>
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

export function RecentActivityTable({
  data,
  isLoading,
}: RecentActivityTableProps) {
  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 flex justify-between items-center border-b border-slate-50">
        <div>
          <h3 className="text-lg font-bold text-on-surface">
            Aktivitas Distribusi Terbaru
          </h3>
          <p className="text-xs text-on-surface-variant">
            Update data real-time pengiriman hari ini
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#1565C0] text-white text-xs font-bold rounded-lg hover:bg-[#004d99] transition-all">
          <Download className="h-4 w-4" />
          Export Laporan
        </button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada aktivitas hari ini"
      />
      <div className="p-6 flex items-center justify-between bg-white border-t border-slate-50">
        <p className="text-xs text-on-surface-variant font-medium">
          Menampilkan {data.length} dari 142 pangkalan
        </p>
        <div className="flex gap-2">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 hover:bg-slate-50 text-xs">
            ‹
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#1565C0] text-white text-xs font-bold">
            1
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 hover:bg-slate-50 text-xs font-bold">
            2
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 hover:bg-slate-50 text-xs font-bold">
            3
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-100 hover:bg-slate-50 text-xs">
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
