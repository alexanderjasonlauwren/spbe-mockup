import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, Package, ShoppingCart } from "lucide-react";

interface MobileNavProps {
  className?: string;
}

const mobileNav = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Products", href: "/products", icon: Package },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
];

export function MobileNav({ className }: MobileNavProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50",
        "pb-safe", // Safe area for iOS
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
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-900",
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
