import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { CanAccess } from "@/features/rbac/components/CanAccess";
import { PERMISSIONS } from "@/features/rbac/permissions";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Settings,
  X,
  LogOut,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Plus,
  List,
  LucideIcon,
  FileText,
  Truck,
  CreditCard,
  MapPin,
  UserCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavItem {
  name: string;
  href?: string;
  icon: LucideIcon;
  permission?: string;
  color: string;
  activeColor: string;
  activeBg: string;
  children?: NavItem[];
  sectionLabel?: string;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-blue-600 dark:text-blue-400",
    activeBg: "bg-blue-50 dark:bg-blue-500/10",
  },
  {
    name: "Schedule Agreement",
    href: "/sa",
    icon: FileText,
    permission: PERMISSIONS.SA_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-amber-600 dark:text-amber-400",
    activeBg: "bg-amber-50 dark:bg-amber-500/10",
    sectionLabel: "Distribusi",
  },
  {
    name: "Rencana Distribusi",
    href: "/distribution",
    icon: Truck,
    permission: PERMISSIONS.DISTRIBUTION_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-cyan-600 dark:text-cyan-400",
    activeBg: "bg-cyan-50 dark:bg-cyan-500/10",
  },
  {
    name: "Pembayaran",
    href: "/payments",
    icon: CreditCard,
    permission: PERMISSIONS.PAYMENTS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    name: "Driver",
    href: "/drivers",
    icon: UserCheck,
    permission: PERMISSIONS.DRIVERS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-purple-600 dark:text-purple-400",
    activeBg: "bg-purple-50 dark:bg-purple-500/10",
    sectionLabel: "Armada",
  },
  {
    name: "Pangkalan",
    icon: MapPin,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-indigo-600 dark:text-indigo-400",
    activeBg: "bg-indigo-50 dark:bg-indigo-500/10",
    sectionLabel: "Manajemen",
    children: [
      {
        name: "Daftar Pangkalan",
        href: "/pangkalan",
        icon: List,
        color: "text-gray-500 dark:text-gray-400",
        activeColor: "text-indigo-600 dark:text-indigo-400",
        activeBg: "bg-indigo-50 dark:bg-indigo-500/10",
      },
      {
        name: "Tambah Pangkalan",
        href: "/products/new",
        icon: Plus,
        permission: PERMISSIONS.PRODUCTS_CREATE,
        color: "text-gray-500 dark:text-gray-400",
        activeColor: "text-indigo-600 dark:text-indigo-400",
        activeBg: "bg-indigo-50 dark:bg-indigo-500/10",
      },
    ],
  },
  {
    name: "Produk LPG",
    href: "/products",
    icon: Package,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-cyan-600 dark:text-cyan-400",
    activeBg: "bg-cyan-50 dark:bg-cyan-500/10",
  },
  {
    name: "Laporan",
    href: "/reports",
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-50 dark:bg-violet-500/10",
  },
  {
    name: "Pengguna",
    href: "/users",
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-sky-600 dark:text-sky-400",
    activeBg: "bg-sky-50 dark:bg-sky-500/10",
  },
  {
    name: "Pengaturan",
    href: "/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
    color: "text-gray-500 dark:text-gray-400",
    activeColor: "text-slate-600 dark:text-slate-400",
    activeBg: "bg-slate-50 dark:bg-slate-500/10",
    sectionLabel: "Sistem",
  },
];

export function Sidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Pangkalan"]);

  const isCollapsed = collapsed && !onClose;

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((n) => n !== itemName)
        : [...prev, itemName],
    );
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const isActive = item.href ? location.pathname === item.href : false;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);

    const content = (
      <div
        className={cn(
          "flex items-center rounded-lg cursor-pointer transition-colors duration-150 group",
          isChild ? "gap-2 px-2 py-1.5 ml-7" : "gap-2.5 px-2 py-2",
          isActive
            ? `${item.activeBg} ${item.activeColor} font-medium`
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 hover:text-gray-900 dark:hover:text-white",
        )}
        onClick={() => {
          if (hasChildren) toggleExpand(item.name);
          else if (item.href) onClose?.();
        }}
      >
        {/* Icon container */}
        <div
          className={cn(
            "flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors duration-150",
            isActive
              ? item.activeBg
              : "bg-gray-100 dark:bg-dark-800 group-hover:bg-gray-200 dark:group-hover:bg-dark-700",
          )}
        >
          <item.icon
            className={cn(
              "h-3.5 w-3.5",
              isActive ? item.activeColor : item.color,
            )}
          />
        </div>

        {/* Label */}
        <span
          className={cn(
            "text-sm whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
            isCollapsed ? "max-w-0 opacity-0" : "flex-1 max-w-xs opacity-100",
          )}
        >
          {item.name}
        </span>

        {/* Chevron */}
        {hasChildren && (
          <span
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out shrink-0",
              isCollapsed ? "w-0 opacity-0" : "w-4 opacity-100",
            )}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
            )}
          </span>
        )}
      </div>
    );

    if (item.href && !hasChildren) {
      return (
        <Link key={item.name} to={item.href}>
          {content}
        </Link>
      );
    }

    return (
      <div key={item.name}>
        {content}
        {hasChildren && isExpanded && !isCollapsed && (
          <div className="mt-0.5 space-y-0.5">
            {item.children!.map((child) => {
              const el = renderNavItem(child, true);
              return child.permission ? (
                <CanAccess key={child.name} permission={child.permission}>
                  {el}
                </CanAccess>
              ) : (
                el
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full border-r border-gray-200 dark:border-dark-800 transition-all duration-300 ease-in-out",
        "bg-white dark:bg-dark-900",
        "dark:[background-image:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(251,146,60,0.08)_0%,transparent_60%)]",
        isCollapsed ? "w-[72px]" : "w-60",
      )}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex border-b border-gray-200 dark:border-dark-800 shrink-0 transition-all duration-300 ease-in-out",
          isCollapsed
            ? "flex-col items-center justify-center py-3 gap-1.5"
            : "flex-row items-center h-14 px-3 gap-2.5",
        )}
      >
        {/* Logo */}
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-md shadow-orange-500/30 shrink-0">
          <span className="text-white font-bold text-[10px]">LPG</span>
        </div>

        {/* Brand text — only participates in layout when expanded */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out min-w-0",
            isCollapsed
              ? "max-w-0 max-h-0 opacity-0"
              : "flex-1 max-w-xs max-h-12 opacity-100",
          )}
        >
          <span className="text-sm font-bold bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-500 bg-clip-text text-transparent block whitespace-nowrap leading-tight">
            GasDistrib
          </span>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap leading-tight">
            Manajemen LPG
          </p>
        </div>

        {/* Mobile close */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden dark:hover:bg-dark-800 shrink-0 ml-auto h-8 w-8"
          >
            <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </Button>
        )}

        {/* Desktop toggle */}
        {!onClose && (
          <Button
            variant="ghost"
            onClick={onToggleCollapse}
            className={cn(
              "hidden lg:flex items-center justify-center h-7 w-7 rounded-md dark:hover:bg-dark-800 shrink-0",
              !isCollapsed && "ml-auto",
            )}
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            )}
          </Button>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-dark-700 space-y-0.5">
        {navigation.map((item) => {
          const navItemEl = renderNavItem(item);
          const wrappedItem = item.permission ? (
            <CanAccess key={item.name} permission={item.permission}>
              {navItemEl}
            </CanAccess>
          ) : (
            navItemEl
          );

          return (
            <div key={item.name}>
              {/* Section label */}
              {item.sectionLabel && (
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isCollapsed
                      ? "max-h-0 opacity-0"
                      : "max-h-8 opacity-100 pt-3 pb-1 px-2",
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {item.sectionLabel}
                  </p>
                </div>
              )}
              {wrappedItem}
            </div>
          );
        })}
      </nav>

      {/* ── User footer ──────────────────────────────────────────── */}
      <div className="px-2 py-3 border-t border-gray-100 dark:border-dark-800 shrink-0">
        <div
          className={cn(
            "flex items-center rounded-xl transition-all duration-300 ease-in-out",
            "bg-gradient-to-r from-orange-50 to-orange-100/60 dark:from-orange-500/10 dark:to-orange-600/5",
            "border border-orange-200/80 dark:border-orange-500/20",
            isCollapsed ? "justify-center p-2" : "px-2.5 py-2 gap-2.5",
          )}
        >
          <Avatar className="h-7 w-7 ring-1 ring-white dark:ring-dark-800 shadow-sm shrink-0">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-[10px]">
              {user?.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Name + role */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out min-w-0",
              isCollapsed
                ? "max-w-0 max-h-0 opacity-0"
                : "flex-1 max-w-xs max-h-12 opacity-100",
            )}
          >
            <p className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap leading-tight">
              {user?.name}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize whitespace-nowrap leading-tight">
              {user?.role}
            </p>
          </div>

          {/* Logout */}
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out shrink-0",
              isCollapsed ? "w-0 opacity-0" : "opacity-100",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="h-7 w-7 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
