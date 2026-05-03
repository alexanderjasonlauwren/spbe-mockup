import { useAuthStore } from "@/features/auth/store/authStore";
import type { ReactNode } from "react";

interface CanAccessProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function CanAccess({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: CanAccessProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (permission) {
    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
  }

  if (permissions) {
    const hasAccess = requireAll
      ? permissions.every((p) => hasPermission(p))
      : permissions.some((p) => hasPermission(p));

    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  return <>{children}</>;
}
