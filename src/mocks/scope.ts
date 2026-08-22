/**
 * Branch scoping.
 *
 * The backend enforces tenancy in SQL (`WHERE tenant_id = ? AND branch_id = ?`,
 * with composite foreign keys making cross-tenant rows structurally
 * impossible). This is the frontend's equivalent: one place that narrows the
 * store to the active branch, so no feature API has to remember to filter.
 *
 * Tenant is fixed by the session and never switchable. Branch is, and may be
 * null — meaning "all branches I can see", which is how HQ gets consolidated
 * figures.
 */

import { getDb } from "./db";
import type { Database, ID, Scoped } from "./types";

export interface ActiveScope {
  tenantId: ID;
  /** null = consolidated across every branch the user may see. */
  branchId: ID | null;
  /** Branches this user is allowed to read. Empty = all of them. */
  allowedBranchIds: ID[];
}

let active: ActiveScope | null = null;

export function setActiveScope(scope: ActiveScope) {
  active = scope;
  // Scope bugs look exactly like stale data, so make the active scope
  // inspectable from the console while developing.
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__scope = scope;
  }
}

export function getActiveScope(): ActiveScope {
  if (active) return active;
  const db = getDb();
  const utama = db.branches.find((b) => b.utama) ?? db.branches[0];
  return {
    tenantId: db.tenant.id,
    branchId: utama?.id ?? null,
    allowedBranchIds: [],
  };
}

function visible(scope: ActiveScope): (row: Scoped) => boolean {
  return (row) => {
    if (row.tenantId !== scope.tenantId) return false;
    if (scope.branchId) return row.branchId === scope.branchId;
    if (scope.allowedBranchIds.length > 0) {
      return scope.allowedBranchIds.includes(row.branchId);
    }
    return true;
  };
}

/**
 * The store, narrowed to the active scope.
 *
 * Returns the same shape as `getDb()` so feature APIs only swap the accessor.
 * Tenant-level tables — chart of accounts, products, users, settings — are not
 * branch-scoped and pass through untouched.
 */
export function scopedDb(override?: Partial<ActiveScope>): Database {
  const scope = { ...getActiveScope(), ...override };
  const db = getDb();
  const keep = visible(scope);

  return {
    ...db,
    outlets: db.outlets.filter(keep),
    drivers: db.drivers.filter(keep),
    scheduleAgreements: db.scheduleAgreements.filter(keep),
    plans: db.plans.filter(keep),
    deliveries: db.deliveries.filter(keep),
    invoices: db.invoices.filter(keep),
    payments: db.payments.filter(keep),
    creditNotes: db.creditNotes.filter(keep),
    receipts: db.receipts.filter(keep),
    orders: db.orders.filter(keep),
    journals: db.journals.filter(keep),
    // planRows have no scope of their own; they follow their plan.
    planRows: db.planRows.filter((r) =>
      db.plans.filter(keep).some((p) => p.id === r.planId),
    ),
  };
}

/** Stamps a new row with the branch it is being created in. */
export function stampScope<T>(row: T, override?: Partial<ActiveScope>): T & Scoped {
  const scope = { ...getActiveScope(), ...override };
  const db = getDb();
  const branchId =
    scope.branchId ?? db.branches.find((b) => b.utama)?.id ?? db.branches[0]?.id ?? "";
  return { ...row, tenantId: scope.tenantId, branchId };
}

/**
 * Query-key prefix for the active scope.
 *
 * A plain function rather than a hook so every call site can use it without
 * plumbing: `useScope()` runs in the layout and sets the active scope before
 * any child renders, and switching branch clears the cache outright.
 */
export function scopeKey(): readonly [string, string] {
  const scope = getActiveScope();
  return [scope.tenantId, scope.branchId ?? "semua"] as const;
}

/** Branches the current user may read, for the switcher. */
export function visibleBranches() {
  const scope = getActiveScope();
  const db = getDb();
  return db.branches.filter(
    (b) =>
      b.tenantId === scope.tenantId &&
      b.aktif &&
      (scope.allowedBranchIds.length === 0 || scope.allowedBranchIds.includes(b.id)),
  );
}
