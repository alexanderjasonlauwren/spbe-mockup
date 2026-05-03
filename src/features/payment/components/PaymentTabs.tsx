import { cn } from "@/lib/utils";
import type { PaymentStatus } from "../types";

type Tab = "Semua" | PaymentStatus;

interface PaymentTabsProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  counts: Record<Tab, number>;
}

const tabs: Tab[] = [
  "Semua",
  "Menunggu Verifikasi",
  "Terverifikasi",
  "Ditolak",
];

export function PaymentTabs({ activeTab, onChange, counts }: PaymentTabsProps) {
  return (
    <div className="flex gap-1 border-b border-slate-100">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "relative px-4 py-3 text-xs font-bold transition-colors whitespace-nowrap",
            activeTab === tab
              ? "text-[#1565C0]"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {tab}
          {counts[tab] > 0 && (
            <span
              className={cn(
                "ml-2 px-1.5 py-0.5 rounded-full text-[9px] font-black",
                activeTab === tab
                  ? "bg-[#1565C0] text-white"
                  : "bg-slate-100 text-on-surface-variant",
              )}
            >
              {counts[tab]}
            </span>
          )}
          {activeTab === tab && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1565C0] rounded-t-full" />
          )}
        </button>
      ))}
    </div>
  );
}
