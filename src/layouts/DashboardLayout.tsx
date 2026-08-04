import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useOpsClock } from "@/hooks/useOpsClock";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keeps today's run moving while the console is open.
  useOpsClock();

  // Lock the page behind the mobile drawer. (The drawer closes itself: every
  // nav item calls onClose.)
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-paper">
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

      <aside className="fixed inset-y-0 left-0 z-50 hidden lg:flex">
        <Sidebar />
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-desk lg:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main
          id="konten"
          className="min-h-screen px-4 pb-14 pt-[5.5rem] sm:px-6 lg:px-7"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
