import { Search } from "lucide-react";
import { MONTH_NAMES_ID } from "@/utils/constants";
import type { SAFilterParams } from "../types";

interface SAFilterBarProps {
  filters: SAFilterParams;
  onFilterChange: (filters: SAFilterParams) => void;
}

export function SAFilterBar({ filters, onFilterChange }: SAFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-surface-container-lowest rounded-xl shadow-sm">
      {/* Month */}
      <select
        value={filters.bulan ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            bulan: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="text-xs font-semibold bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1565C0] outline-none"
      >
        <option value="">Semua Bulan</option>
        {MONTH_NAMES_ID.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>

      {/* Year */}
      <select
        value={filters.tahun ?? ""}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            tahun: e.target.value ? Number(e.target.value) : undefined,
          })
        }
        className="text-xs font-semibold bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1565C0] outline-none"
      >
        <option value="">Semua Tahun</option>
        <option value={2026}>2026</option>
        <option value={2025}>2025</option>
        <option value={2024}>2024</option>
        <option value={2023}>2023</option>
      </select>

      {/* Status */}
      <select
        value={filters.status ?? "Semua"}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            status: e.target.value as SAFilterParams["status"],
          })
        }
        className="text-xs font-semibold bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#1565C0] outline-none"
      >
        <option value="Semua">Semua Status</option>
        <option value="Aktif">Aktif</option>
        <option value="Selesai">Selesai</option>
        <option value="Draft">Draft</option>
        <option value="Limit">Limit</option>
      </select>

      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant" />
        <input
          type="text"
          placeholder="Cari nomor SA..."
          value={filters.search ?? ""}
          onChange={(e) =>
            onFilterChange({ ...filters, search: e.target.value })
          }
          className="w-full pl-9 pr-3 py-2 text-xs bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-[#1565C0] outline-none"
        />
      </div>
    </div>
  );
}
