import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getUnreadCount } from "@/features/notification/api/notificationApi";
import { APP_NAME, APP_SUBTITLE } from "@/utils/constants";
import { BOTTOM_NAV, NAV_GROUPS, type NavItem } from "./nav";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const unread = useQuery({
    queryKey: ["unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const badge = item.href === "/notifications" ? unread.data ?? 0 : 0;

    return (
      <NavLink
        key={item.href}
        to={item.href}
        onClick={onClose}
        title={item.hint}
        className={({ isActive }) =>
          cn(
            // The active item carries the amber spine — the same device used on
            // rows and badges, so "where am I" reads like any other status.
            "relative flex items-center gap-3 py-2 pl-5 pr-3 text-sm transition-colors duration-150",
            "before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[3px] before:rounded-r-sm",
            isActive
              ? "bg-white/[0.06] font-semibold text-nav-fg before:bg-signal"
              : "font-medium text-nav-fg-muted before:bg-transparent hover:bg-white/[0.04] hover:text-nav-fg",
          )
        }
      >
        <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" strokeWidth={1.75} />
        <span className="truncate">{item.name}</span>
        {badge > 0 && (
          <span className="data ml-auto rounded-sm bg-signal px-1.5 py-px text-2xs font-semibold text-[rgb(23_26_22)]">
            {badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col overflow-hidden bg-nav dark:border-r dark:border-line">
      {/* Wordmark */}
      <div className="flex items-center gap-3 px-5 py-5">
        <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
          <rect width="32" height="32" rx="6" fill="rgb(224 163 46)" />
          <rect x="7" y="7" width="3" height="18" fill="rgb(23 26 22)" />
          <rect x="13" y="9" width="12" height="3" rx="1.5" fill="rgb(23 26 22)" />
          <rect x="13" y="15" width="8" height="3" rx="1.5" fill="rgb(23 26 22 / .55)" />
          <rect x="13" y="21" width="10" height="3" rx="1.5" fill="rgb(23 26 22 / .55)" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-tight tracking-[-0.02em] text-nav-fg">
            {APP_NAME}
          </p>
          <p className="label text-[0.625rem] text-nav-fg-muted">
            {APP_SUBTITLE}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded p-1 text-nav-fg-muted hover:bg-white/10 hover:text-nav-fg lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="label px-5 pb-2 text-[0.625rem] text-nav-fg-muted">
              {group.label}
            </p>
            <div className="flex flex-col">{group.items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 py-3">
        {BOTTOM_NAV.map(renderItem)}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 py-2 pl-5 pr-3 text-sm font-medium text-nav-fg-muted transition-colors hover:bg-white/[0.04] hover:text-nav-fg"
        >
          <LogOut className="h-[1.05rem] w-[1.05rem] shrink-0" strokeWidth={1.75} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
