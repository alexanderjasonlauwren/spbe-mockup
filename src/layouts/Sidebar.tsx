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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  bgColor: string;
  darkBgColor: string;
  children?: NavItem[];
  sectionLabel?: string;
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50",
    darkBgColor: "dark:bg-blue-500/10",
  },
  {
    name: "Schedule Agreement",
    href: "/sa",
    icon: FileText,
    permission: PERMISSIONS.SA_VIEW,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50",
    darkBgColor: "dark:bg-amber-500/10",
    sectionLabel: "Distribusi",
  },
  {
    name: "Rencana Distribusi",
    href: "/distribution",
    icon: Truck,
    permission: PERMISSIONS.DISTRIBUTION_VIEW,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-50",
    darkBgColor: "dark:bg-cyan-500/10",
  },
  {
    name: "Pembayaran",
    href: "/payments",
    icon: CreditCard,
    permission: PERMISSIONS.PAYMENTS_VIEW,
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-50",
    darkBgColor: "dark:bg-emerald-500/10",
  },
  {
    name: "Driver",
    href: "/drivers",
    icon: UserCheck,
    permission: PERMISSIONS.DRIVERS_VIEW,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50",
    darkBgColor: "dark:bg-purple-500/10",
    sectionLabel: "Armada",
  },
  {
    name: "Pangkalan",
    icon: MapPin,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-50",
    darkBgColor: "dark:bg-indigo-500/10",
    sectionLabel: "Manajemen",
    children: [
      {
        name: "Daftar Pangkalan",
        href: "/products",
        icon: List,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50",
        darkBgColor: "dark:bg-indigo-500/10",
      },
      {
        name: "Tambah Pangkalan",
        href: "/products/new",
        icon: Plus,
        permission: PERMISSIONS.PRODUCTS_CREATE,
        color: "text-indigo-600 dark:text-indigo-400",
        bgColor: "bg-indigo-50",
        darkBgColor: "dark:bg-indigo-500/10",
      },
    ],
  },
  {
    name: "Laporan",
    href: "/reports",
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_VIEW,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-50",
    darkBgColor: "dark:bg-violet-500/10",
  },
  {
    name: "Pengguna",
    href: "/users",
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-50",
    darkBgColor: "dark:bg-sky-500/10",
  },
  {
    name: "Pengaturan",
    href: "/settings",
    icon: Settings,
    permission: PERMISSIONS.SETTINGS_VIEW,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50",
    darkBgColor: "dark:bg-slate-500/10",
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

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  const toggleExpand = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName],
    );
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const isActive = item.href ? location.pathname === item.href : false;
    const isExpanded = expandedItems.includes(item.name);
    const hasChildren = item.children && item.children.length > 0;

    const NavItemContent = (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all group relative overflow-hidden cursor-pointer",
          isChild && "ml-4 py-2",
          isActive
            ? `${item.bgColor} ${item.darkBgColor} ${item.color} shadow-sm`
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800",
        )}
        onClick={() => {
          if (hasChildren) {
            toggleExpand(item.name);
          } else if (item.href) {
            onClose?.();
          }
        }}
      >
        <div
          className={cn(
            "p-2 rounded-lg transition-all shrink-0",
            isActive
              ? `${item.bgColor} ${item.darkBgColor}`
              : "bg-gray-100 dark:bg-dark-800 group-hover:bg-gray-200 dark:group-hover:bg-dark-700",
            collapsed && !onClose && "mx-auto",
          )}
        >
          <item.icon
            className={cn(
              "h-4 w-4",
              isActive ? item.color : "text-gray-500 dark:text-gray-400",
            )}
          />
        </div>
        {!collapsed && (
          <>
            <span className="relative flex-1 truncate">{item.name}</span>
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0" />
              ))}
          </>
        )}
      </div>
    );

    if (item.href && !hasChildren) {
      return (
        <Link key={item.name} to={item.href}>
          {NavItemContent}
        </Link>
      );
    }

    return (
      <div key={item.name}>
        {NavItemContent}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => {
              const childContent = renderNavItem(child, true);
              if (child.permission) {
                return (
                  <CanAccess key={child.name} permission={child.permission}>
                    {childContent}
                  </CanAccess>
                );
              }
              return childContent;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full border-r border-gray-200 dark:border-dark-800 transition-all duration-300",
        "bg-white dark:bg-dark-900",
        "dark:[background-image:radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(251,146,60,0.08)_0%,transparent_60%)]",
        collapsed && !onClose ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-dark-800 shrink-0">
        {!collapsed || onClose ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                  <span className="text-white font-bold text-xs">LPG</span>
                </div>
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-400 dark:to-orange-500 bg-clip-text text-transparent block truncate">
                  GasDistrib
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  Manajemen LPG
                </p>
              </div>
            </div>

            {onClose ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="lg:hidden dark:hover:bg-dark-800 shrink-0"
              >
                <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="hidden lg:flex dark:hover:bg-dark-800 shrink-0"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <PanelLeftClose className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                )}
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="relative mx-auto">
              <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="text-white font-bold text-xs">LPG</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="absolute right-2 top-3 dark:hover:bg-dark-800"
              title="Expand sidebar"
            >
              <PanelLeft className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-dark-700">
        <div className="space-y-0.5">
          {navigation.map((item) => {
            const showSectionLabel = item.sectionLabel && !collapsed;

            const navItemEl = renderNavItem(item);
            const wrappedItem =
              item.permission ? (
                <CanAccess key={item.name} permission={item.permission}>
                  {navItemEl}
                </CanAccess>
              ) : (
                navItemEl
              );

            return (
              <div key={item.name}>
                {showSectionLabel && (
                  <div className="px-3 pt-4 pb-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {item.sectionLabel}
                    </p>
                  </div>
                )}
                {wrappedItem}
              </div>
            );
          })}
        </div>
      </nav>

      <Separator className="dark:bg-dark-800" />

      {/* User info */}
      <div className="p-3 shrink-0">
        {!collapsed || onClose ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-600/10 border border-orange-200 dark:border-orange-500/20">
            <Avatar className="h-9 w-9 ring-2 ring-white dark:ring-dark-800 shadow-md shrink-0">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-xs">
                {user?.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate capitalize">
                {user?.role}
              </p>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="shrink-0 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar
              className="h-9 w-9 ring-2 ring-orange-500 dark:ring-orange-400 shadow-lg cursor-pointer hover:ring-4 transition-all"
              onClick={handleLogout}
              title="Logout"
            >
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-xs">
                {user?.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>
    </div>
  );
}
