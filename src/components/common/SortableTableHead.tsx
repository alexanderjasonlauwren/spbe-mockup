import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

interface SortableTableHeadProps<TSortKey extends string> {
  label: string;
  sortKey: TSortKey;
  activeSortKey: TSortKey;
  sortDirection: SortDirection;
  onSort: (sortKey: TSortKey) => void;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SortableTableHead<TSortKey extends string>({
  label,
  sortKey,
  activeSortKey,
  sortDirection,
  onSort,
  align = "left",
  className,
}: SortableTableHeadProps<TSortKey>) {
  const isActive = activeSortKey === sortKey;

  return (
    <TableHead className={cn("px-4 py-3", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 transition-colors hover:text-gray-900 dark:hover:text-white",
          align === "right" && "ml-auto",
          align === "center" && "mx-auto",
        )}
      >
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 transition-colors group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300" />
        )}
      </button>
    </TableHead>
  );
}
