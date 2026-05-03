import { useState } from "react";
import { Trash2, Plus, Printer } from "lucide-react";
import { PlanSummaryChips } from "./PlanSummaryChips";
import { StatusBadge, getStatusVariant } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { PANGKALAN_LIST, DRIVER_NAMES } from "@/utils/constants";
import type { PlanRow, DistributionPlan } from "../types";

interface PlanDetailPanelProps {
  plan: DistributionPlan | null;
  rows: PlanRow[];
  isLoading: boolean;
  onSaveDraft: (rows: PlanRow[]) => void;
  onConfirm: () => void;
  isSaving: boolean;
  isConfirming: boolean;
}

export function PlanDetailPanel({
  plan,
  rows: initialRows,
  isLoading,
  onSaveDraft,
  onConfirm,
  isSaving,
  isConfirming,
}: PlanDetailPanelProps) {
  const [rows, setRows] = useState<PlanRow[]>(initialRows);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!plan) {
    return (
      <div className="bg-surface-container-lowest rounded-xl shadow-sm h-full">
        <EmptyState
          title="Pilih Rencana Distribusi"
          description="Pilih rencana dari panel kiri atau buat rencana baru"
        />
      </div>
    );
  }

  const totalTabung = rows.reduce((s, r) => s + r.jumlahTabung, 0);

  const addRow = () => {
    const newRow: PlanRow = {
      id: `row-${Date.now()}`,
      pangkalan: PANGKALAN_LIST[0],
      alamat: "—",
      jumlahTabung: 0,
      driver: DRIVER_NAMES[0],
      jamPengiriman: "08:00",
      statusBayar: "Belum Lunas",
    };
    setRows([...rows, newRow]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter((r) => r.id !== id));
  };

  const updateRow = <K extends keyof PlanRow>(
    id: string,
    key: K,
    value: PlanRow[K],
  ) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-50">
        <PlanSummaryChips
          totalTabung={totalTabung}
          jumlahPangkalan={rows.length}
          jumlahDriver={new Set(rows.map((r) => r.driver)).size}
        />
      </div>

      {/* Editable Table */}
      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low">
                {[
                  "Pangkalan",
                  "Alamat",
                  "Jml Tabung",
                  "Driver",
                  "Jam",
                  "Bayar",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <select
                      value={row.pangkalan}
                      onChange={(e) =>
                        updateRow(row.id, "pangkalan", e.target.value)
                      }
                      className="text-xs bg-transparent border-b border-outline-variant focus:border-[#1565C0] outline-none py-1 min-w-[140px]"
                    >
                      {PANGKALAN_LIST.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    {row.alamat}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={row.jumlahTabung}
                      onChange={(e) =>
                        updateRow(
                          row.id,
                          "jumlahTabung",
                          Number(e.target.value),
                        )
                      }
                      className="text-xs w-20 bg-transparent border-b border-outline-variant focus:border-[#1565C0] outline-none py-1 text-right"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.driver}
                      onChange={(e) =>
                        updateRow(row.id, "driver", e.target.value)
                      }
                      className="text-xs bg-transparent border-b border-outline-variant focus:border-[#1565C0] outline-none py-1 min-w-[120px]"
                    >
                      {DRIVER_NAMES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="time"
                      value={row.jamPengiriman}
                      onChange={(e) =>
                        updateRow(row.id, "jamPengiriman", e.target.value)
                      }
                      className="text-xs bg-transparent border-b border-outline-variant focus:border-[#1565C0] outline-none py-1"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant={getStatusVariant(row.statusBayar)}
                      label={row.statusBayar}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button
          onClick={addRow}
          className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold text-[#1565C0] border-2 border-dashed border-outline-variant hover:border-[#1565C0] hover:bg-blue-50/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          Tambah Baris
        </button>
      </div>

      {/* Sticky Action Bar */}
      <div className="border-t border-slate-100 bg-white p-4 flex items-center gap-3">
        <button
          onClick={() => onSaveDraft(rows)}
          disabled={isSaving}
          className="px-5 py-2.5 text-sm font-bold border border-outline-variant rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          Simpan Draft
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold border border-outline-variant rounded-lg hover:bg-slate-50 transition-colors">
          <Printer className="h-4 w-4" />
          Cetak
        </button>
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={isConfirming}
          className="ml-auto px-5 py-2.5 text-sm font-bold bg-[#1565C0] text-white rounded-lg hover:bg-[#004d99] transition-colors disabled:opacity-60"
        >
          Konfirmasi Rencana
        </button>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Konfirmasi Rencana Distribusi"
        message="Apakah Anda yakin ingin mengkonfirmasi rencana distribusi ini? Rencana yang sudah dikonfirmasi tidak dapat diubah."
        confirmLabel="Ya, Konfirmasi"
        onConfirm={() => {
          onConfirm();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
        variant="default"
      />
    </div>
  );
}
