import type { LucideIcon } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "Tidak ada data",
  emptyDescription,
  emptyIcon,
  className,
}: DataTableProps<T>) {
  const alignClass = {
    left: "text-left",
    right: "text-right",
    center: "text-center",
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container-low">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant",
                  alignClass[col.align ?? "left"]
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, rowIdx) => (
              <tr key={rowIdx}>
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState
                  icon={emptyIcon}
                  title={emptyMessage}
                  description={emptyDescription}
                />
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  "hover:bg-slate-50/50 transition-colors",
                  rowIdx % 2 === 1 && "bg-surface-container-low/30"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-6 py-4 text-sm",
                      alignClass[col.align ?? "left"]
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
