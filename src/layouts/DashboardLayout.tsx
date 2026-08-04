import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useOpsClock } from "@/hooks/useOpsClock";
import { useSidebarShortcut, useSidebarStore } from "@/hooks/useSidebar";
import { useScope } from "@/features/tenancy/useScope";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const collapsed = useSidebarStore((s) => s.collapsed);

  // Establishes the active branch before any child query runs.
  const { branchId } = useScope();

  // Keeps today's run moving while the console is open.
  useOpsClock();
  useSidebarShortcut();

  // Lock the page behind the mobile drawer. (The drawer closes itself: every
  // nav item calls onClose.)
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div
      className="app-shell min-h-screen bg-paper"
      data-sidebar={collapsed ? "collapsed" : "expanded"}
    >
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2100] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-on"
      >
        Lompat ke konten
      </a>

      {sidebarOpen && (
        <div
          className="animate-in-fade fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Desktop sidebar is a grid column — its width is the grid's job now. */}
      <aside className="sticky top-0 hidden h-screen overflow-hidden lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer stays an overlay. */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-desk lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {/* Keyed on the branch: pages do not read the URL themselves, so without
            a remount their query keys would keep the scope they were last
            rendered with and quietly show the previous branch's data. */}
        <main
          id="konten"
          key={branchId ?? "semua"}
          className="flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-7"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
