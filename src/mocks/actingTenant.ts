/**
 * The acting tenant, held where both the store and the scope can reach it.
 *
 * # Why this is its own module
 *
 * `getDb()` has to resolve settings for the acting tenant, and `getActiveScope()`
 * falls back to reading the store when no scope has been set yet. Point those at
 * each other and the first call recurses: getDb -> getActiveScope -> getDb.
 *
 * So the one value they both need lives here, in a module that imports nothing.
 * `setActiveScope` keeps it in step; nothing else writes it.
 */
import type { ID } from "@/types/domain";

let actingTenantId: ID = "";

export function setActingTenant(id: ID): void {
  actingTenantId = id;
}

/** Empty before the layout has resolved a scope — callers fall back to a root. */
export function getActingTenant(): ID {
  return actingTenantId;
}
