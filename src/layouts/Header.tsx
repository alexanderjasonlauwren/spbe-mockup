import { Bell, Menu } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getInitials } from "@/lib/utils";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sa": "Schedule Agreement",
  "/distribution": "Perencanaan Distribusi",
  "/monitoring": "Monitoring Distribusi",
  "/payments": "Pembayaran",
  "/notifications": "Notifikasi",
  "/settings": "Pengaturan",
};

export function Header({ onMenuClick }: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] ?? "Dashboard";

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-60 h-16 z-[1001] bg-white/70 backdrop-blur-xl border-b border-slate-100 flex justify-between items-center px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="font-semibold text-lg text-slate-900">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative text-slate-500 hover:bg-slate-50 rounded-full p-2 transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">
              {user?.role ?? "Logistics Manager"}
            </p>
          </div>
          <div className="w-9 h-9 rounded-full bg-[#1565C0] flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {getInitials(user?.name ?? "A")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
