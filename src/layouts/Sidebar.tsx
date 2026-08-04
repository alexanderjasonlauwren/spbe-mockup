import { scopeKey } from "@/mocks/scope";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getUnreadCount } from "@/features/notification/api/notificationApi";
import { useRevealActiveGroup, useSidebarStore } from "@/hooks/useSidebar";
import { APP_NAME, APP_SUBTITLE } from "@/utils/constants";
import { BOTTOM_NAV, NAV_GROUPS, type NavItem } from "./nav";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const collapsed = useSidebarStore((s) => s.collapsed);
  const openGroups = useSidebarStore((s) => s.openGroups);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const toggleGroup = useSidebarStore((s) => s.toggleGroup);

  useRevealActiveGroup(location.pathname);

  // The mobile drawer is always full width — a rail on a phone is pointless.
  const isRail = collapsed && !onClose;

  const unread = useQuery({
    queryKey: [...scopeKey(), "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const badge = item.href === "/notifications" ? (unread.data ?? 0) : 0;

    return (
      <NavLink
        key={item.href}
        to={item.href}
        onClick={onClose}
        title={isRail ? item.name : item.hint}
        className={({ isActive }) =>
          cn(
            // The active item carries the amber spine — the same device used on
            // rows and badges, so "where am I" reads like any other status.
            "relative flex items-center gap-3 py-2 text-sm transition-colors duration-150",
            "before:absolute before:bottom-1 before:left-0 before:top-1 before:w-[3px] before:rounded-r-sm",
            isRail ? "mx-2 justify-center rounded-md px-0" : "pl-5 pr-3",
            isActive
              ? "bg-white/[0.06] font-semibold text-nav-fg before:bg-signal"
              : "font-medium text-nav-fg-muted before:bg-transparent hover:bg-white/[0.04] hover:text-nav-fg",
          )
        }
      >
        <span className="relative">
          <Icon className="h-[1.05rem] w-[1.05rem] shrink-0" strokeWidth={1.75} />
          {isRail && badge > 0 && (
            <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-signal" />
          )}
        </span>

        {!isRail && (
          <>
            <span className="truncate">{item.name}</span>
            {badge > 0 && (
              <span className="data ml-auto rounded-sm bg-signal px-1.5 py-px text-2xs font-semibold text-[rgb(23_26_22)]">
                {badge}
              </span>
            )}
          </>
        )}

      </NavLink>
    );
  };

  return (
    <div
      className={cn(
        // Fills its grid column on desktop; the overlay drawer sets its own.
        "flex h-full flex-col overflow-hidden bg-nav dark:border-r dark:border-line",
        onClose ? "w-64" : "w-full",
      )}
    >
      {/* Wordmark */}
      <div
        className={cn(
          "flex items-center gap-3 py-5",
          isRail ? "justify-center px-0" : "px-5",
        )}
      >
        <svg viewBox="0 0 32 32" className="h-9 w-9 shrink-0" aria-hidden>
          <rect width="32" height="32" rx="6" fill="rgb(224 163 46)" />
          <rect x="7" y="7" width="3" height="18" fill="rgb(23 26 22)" />
          <rect x="13" y="9" width="12" height="3" rx="1.5" fill="rgb(23 26 22)" />
          <rect x="13" y="15" width="8" height="3" rx="1.5" fill="rgb(23 26 22 / .55)" />
          <rect x="13" y="21" width="10" height="3" rx="1.5" fill="rgb(23 26 22 / .55)" />
        </svg>

        {!isRail && (
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold leading-tight tracking-[-0.02em] text-nav-fg">
              {APP_NAME}
            </p>
            <p className="label text-[0.625rem] text-nav-fg-muted">{APP_SUBTITLE}</p>
          </div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded p-1 text-nav-fg-muted hover:bg-white/10 hover:text-nav-fg lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Beside the wordmark, where people look for it — not buried at the
            bottom under the sign-out button. */}
        {!onClose && !isRail && (
          <button
            onClick={toggleCollapsed}
            aria-label="Perkecil menu"
            title="Perkecil menu  ⌘B"
            className="rounded p-1.5 text-nav-fg-muted transition-colors hover:bg-white/10 hover:text-nav-fg"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* In rail mode the toggle gets its own row: the logo has no space left. */}
      {!onClose && isRail && (
        <button
          onClick={toggleCollapsed}
          aria-label="Perlebar menu"
          title="Perlebar menu  ⌘B"
          className="mx-2 mb-2 flex items-center justify-center rounded-md py-2 text-nav-fg-muted transition-colors hover:bg-white/[0.06] hover:text-nav-fg"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      {/* Accordion navigation */}
      <nav className="flex-1 overflow-y-auto pb-4">
        {NAV_GROUPS.map((group) => {
          const open = openGroups.includes(group.label);
          const hasActive = group.items.some(
            (i) =>
              location.pathname === i.href || location.pathname.startsWith(`${i.href}/`),
          );

          // Rail mode has no room for headers, so groups are always shown and
          // separated by a rule instead.
          if (isRail) {
            return (
              <div
                key={group.label}
                className="mb-2 flex flex-col border-b border-white/10 pb-2 last:border-b-0"
              >
                {group.items.map(renderItem)}
              </div>
            );
          }

          return (
            <div key={group.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-5 py-2 text-nav-fg-muted transition-colors hover:text-nav-fg"
              >
                <span className="label text-[0.625rem]">{group.label}</span>
                {/* A collapsed group holding the current page still says so. */}
                {!open && hasActive && (
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden />
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto h-3.5 w-3.5 transition-transform duration-200",
                    open ? "rotate-0" : "-rotate-90",
                  )}
                />
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-desk",
                  open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="overflow-hidden">
                  <div className="flex flex-col pb-2">{group.items.map(renderItem)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 py-3">
        {BOTTOM_NAV.map(renderItem)}

        <button
          onClick={handleLogout}
          title={isRail ? "Keluar" : undefined}
          className={cn(
            "relative flex items-center gap-3 py-2 text-sm font-medium text-nav-fg-muted transition-colors hover:bg-white/[0.04] hover:text-nav-fg",
            isRail ? "mx-2 justify-center rounded-md px-0" : "w-full pl-5 pr-3",
          )}
        >
          <LogOut className="h-[1.05rem] w-[1.05rem] shrink-0" strokeWidth={1.75} />
          {!isRail && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );
}
