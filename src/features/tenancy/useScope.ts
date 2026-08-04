import { useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getDb } from "@/mocks/db";
import { setActiveScope } from "@/mocks/scope";
import { useAuthStore } from "@/features/auth/store/authStore";

/** "semua" in the URL means the consolidated, cross-branch view. */
export const ALL_BRANCHES = "semua";

/**
 * Active branch, held in the URL.
 *
 * The URL is the source of truth so a pasted link opens the same records for a
 * colleague — the property that decides whether "look at this surat jalan" is a
 * useful message or a confusing one. Tenant is never here: it comes from the
 * session and is not switchable.
 */
export function useScope() {
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Raw store: the switcher must list branches, which scopedDb would filter out.
  const db = getDb();
  const branches = useMemo(
    () => db.branches.filter((b) => b.aktif),
    [db.branches],
  );

  // Which branches this user may read. Empty means every branch.
  const allowedBranchIds = useMemo(
    () => user?.branchIds ?? [],
    [user?.branchIds],
  );
  const canSeeAll = allowedBranchIds.length === 0 || allowedBranchIds.length > 1;

  const visibleBranches = useMemo(
    () =>
      allowedBranchIds.length === 0
        ? branches
        : branches.filter((b) => allowedBranchIds.includes(b.id)),
    [branches, allowedBranchIds],
  );

  const raw = params.get("cabang");
  const fallback =
    visibleBranches.find((b) => b.utama)?.id ?? visibleBranches[0]?.id ?? null;

  // An unknown or disallowed branch in the URL falls back rather than showing
  // an empty console with no explanation.
  const branchId =
    raw === ALL_BRANCHES && canSeeAll
      ? null
      : (visibleBranches.find((b) => b.id === raw || b.kode === raw)?.id ??
        fallback);

  const scope = useMemo(
    () => ({
      tenantId: db.tenant.id,
      branchId,
      allowedBranchIds,
    }),
    [db.tenant.id, branchId, allowedBranchIds],
  );

  // The mock store reads scope synchronously, so it must be set before any
  // query function runs.
  setActiveScope(scope);

  const setBranch = useCallback(
    (next: string | null) => {
      const value = next === null ? ALL_BRANCHES : next;

      // Order matters: clearing the cache triggers an immediate refetch, and
      // those queries read the scope synchronously. Set it before clearing, or
      // the refetch runs against the branch we just left.
      setActiveScope({
        tenantId: db.tenant.id,
        branchId: next,
        allowedBranchIds,
      });

      const params = new URLSearchParams(window.location.search);
      params.set("cabang", value);
      setParams(params, { replace: false });
      queryClient.clear();
    },
    [setParams, queryClient, db.tenant.id, allowedBranchIds],
  );

  // Keep the URL explicit, so a link always carries its scope.
  useEffect(() => {
    if (raw) return;
    const params = new URLSearchParams(window.location.search);
    params.set("cabang", branchId ?? ALL_BRANCHES);
    setParams(params, { replace: true });
  }, [raw, branchId, setParams]);

  return {
    tenant: db.tenant,
    branches: visibleBranches,
    branchId,
    branch: visibleBranches.find((b) => b.id === branchId) ?? null,
    isConsolidated: branchId === null,
    canSeeAll,
    setBranch,
    /** Prefix for every query key, so caches never bleed across branches. */
    key: [db.tenant.id, branchId ?? ALL_BRANCHES] as const,
  };
}
