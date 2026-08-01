import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  LogOut,
  FileText,
  Truck,
  CreditCard,
  Bell,
  Wallet,
  Receipt,
} from "lucide-react";
import { APP_NAME, APP_SUBTITLE } from "@/utils/constants";
interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  bottom?: boolean;
}

const mainNav: NavItem[] = [
  { name: "Beranda", href: "/dashboard", icon: LayoutDashboard },
  { name: "Schedule Agreement", href: "/sa", icon: FileText },
  { name: "Perencanaan Distribusi", href: "/distribution", icon: Truck },
  { name: "Monitoring Distribusi", href: "/monitoring", icon: BarChart3 },
  { name: "OCR Kwitansi", href: "/ocr", icon: Receipt },
  { name: "Pembayaran", href: "/payments", icon: CreditCard },
  { name: "Laporan Keuangan", href: "/reports", icon: Wallet },
];

const bottomNav: NavItem[] = [
  { name: "Notifikasi", href: "/notifications", icon: Bell },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const renderItem = (item: NavItem) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all text-sm font-medium",
          isActive
            ? "bg-[#1565C0] text-white"
            : "text-slate-300 hover:text-white hover:bg-white/10",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <aside className="h-full w-60 bg-[#1A2744] flex flex-col py-6 gap-1 overflow-hidden">
      {/* Logo */}
      <div className="px-6 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#1565C0] flex items-center justify-center shrink-0">
          <Truck className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest">
            {APP_SUBTITLE}
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
        {mainNav.map(renderItem)}
      </nav>

      {/* Bottom Navigation */}
      <div className="flex flex-col gap-0.5 mt-2">
        {bottomNav.map(renderItem)}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
