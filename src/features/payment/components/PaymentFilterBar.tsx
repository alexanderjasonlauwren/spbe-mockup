import { Search } from "lucide-react";

interface PaymentFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
}

export function PaymentFilterBar({
  search,
  onSearchChange,
}: PaymentFilterBarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
        <input
          type="text"
          placeholder="Cari pangkalan..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-4 py-2 text-sm border border-outline-variant rounded-lg bg-surface-container-lowest outline-none focus:border-[#1565C0] w-64"
        />
      </div>
    </div>
  );
}
