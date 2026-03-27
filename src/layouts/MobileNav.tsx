import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Truck,
  CreditCard,
  Settings,
} from "lucide-react";

interface MobileNavProps {
  className?: string;
}

const mobileNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "SA", href: "/sa", icon: FileText },
  { name: "Distribusi", href: "/distribution", icon: Truck },
  { name: "Bayar", href: "/payments", icon: CreditCard },
  { name: "Pengaturan", href: "/settings", icon: Settings },
];

export function MobileNav({ className }: MobileNavProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-900 border-t border-gray-200 dark:border-dark-800 z-50",
        "pb-safe",
        className,
      )}
    >
      <div className="flex items-center justify-around h-16">
        {mobileNav.map((item) => {
          const isActive = location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1",
                "transition-colors",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
