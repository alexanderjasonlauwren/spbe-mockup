import { Eye, ArrowRight, Download } from "lucide-react";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import { InlineProgress } from "@/components/common/InlineProgress";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import type { ScheduleAgreement } from "../types";
import { useState } from "react";

interface SATableProps {
  data: ScheduleAgreement[];
  isLoading: boolean;
  onConvert: (id: string) => void;
  onDownload: (id: string) => void;
}

export function SATable({
  data,
  isLoading,
  onConvert,
  onDownload,
}: SATableProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const columns: Column<ScheduleAgreement>[] = [
    {
      key: "nomorSA",
      header: "No SA",
      render: (row) => (
        <span className="font-bold text-on-surface text-xs">{row.nomorSA}</span>
      ),
    },
    {
      key: "spbe",
      header: "SPBE",
      render: (row) => (
        <span className="text-xs text-on-surface">{row.spbe}</span>
      ),
    },
    {
      key: "periode",
      header: "Periode",
      render: (row) => (
        <span className="text-xs text-on-surface-variant">
          {row.periodeMultai} – {row.periodeBerakhir}
        </span>
      ),
    },
    {
      key: "totalKuota",
      header: "Total Kuota",
      align: "right",
      render: (row) => (
        <span className="text-xs font-bold text-on-surface">
          {row.totalKuota.toLocaleString("id-ID")} MT
        </span>
      ),
    },
    {
      key: "distribusi",
      header: "Didistribusikan",
      align: "right",
      render: (row) => (
        <span className="text-xs font-bold text-[#1565C0]">
          {row.sudahDidistribusikan.toLocaleString("id-ID")} MT
        </span>
      ),
    },
    {
      key: "sisaKuota",
      header: "Sisa Kuota",
      render: (row) => {
        const pct =
          row.totalKuota > 0 ? (row.sisaKuota / row.totalKuota) * 100 : 0;
        return (
          <div className="min-w-[120px]">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-on-surface-variant">
                {row.sisaKuota.toLocaleString("id-ID")}
              </span>
            </div>
            <InlineProgress value={pct} showLabel colorAuto />
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          variant={getStatusVariant(row.status)}
          label={row.status}
        />
      ),
    },
    {
      key: "aksi",
      header: "Aksi",
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            title="Detail"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-on-surface-variant transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            title="Konversi ke Rencana"
            onClick={() => setConfirmId(row.id)}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-[#1565C0] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            title="Download PDF"
            onClick={() => onDownload(row.id)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-on-surface-variant transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        emptyMessage="Belum ada Schedule Agreement"
        emptyDescription="Upload SA baru untuk memulai distribusi"
      />
      <ConfirmDialog
        isOpen={confirmId !== null}
        title="Konversi Schedule Agreement"
        message="Konversi SA ini menjadi rencana distribusi? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Konversi"
        onConfirm={() => {
          if (confirmId) onConvert(confirmId);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
        variant="default"
      />
    </>
  );
}
