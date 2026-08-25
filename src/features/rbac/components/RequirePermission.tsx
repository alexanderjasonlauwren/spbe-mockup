import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { landingPathFor } from "@/layouts/nav";
import { Panel } from "@/components/common/Panel";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";

/**
 * Gates a route on a permission.
 *
 * The sidebar already hides what a role cannot use, but hiding a link is not
 * access control — a sopir who types /ledger reached the general ledger, which
 * is the whole finance position of the agency. `ProtectedRoute` only ever asked
 * whether someone was signed in.
 *
 * Renders a stated refusal rather than redirecting: a silent bounce to the
 * dashboard reads as a broken link, and leaves the person guessing whether the
 * page exists.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const role = useAuthStore((s) => s.user?.role);

  if (hasPermission(permission)) return <>{children}</>;

  return (
    <Panel spine="text-rust">
      <EmptyState
        icon={ShieldOff}
        title="Halaman ini di luar akses Anda"
        description="Peran akun Anda tidak mencakup halaman ini. Hubungi admin agen bila Anda memang memerlukannya."
        action={
          <Button asChild size="sm">
            <Link to={landingPathFor(role)}>Kembali ke halaman Anda</Link>
          </Button>
        }
      />
    </Panel>
  );
}
