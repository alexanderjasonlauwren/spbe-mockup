/**
 * The tenant list, readable synchronously.
 *
 * # Why a registry rather than a query
 *
 * `useScope` must produce a scope DURING render — `setActiveScope` runs before
 * any child renders, because the mock store and the lexicon read it
 * synchronously and cannot wait for a commit. But the tenant list comes from an
 * adapter, and adapters are async.
 *
 * So the list lives here: the layout fetches it once and pushes it in, and
 * useScope reads whatever is present. Same shape as `lexicon.ts` and
 * `actingTenant.ts`, and for the same reason.
 *
 * # Why this exists at all
 *
 * useScope used to read `getDb().tenants` directly. That worked, and it meant
 * the switcher was wired to the MOCK in every build — so an API build would have
 * listed tenants from the seed database while every other screen talked to the
 * server. Showing tenants that do not exist is worse than showing none.
 */
import { usesApi } from "@/lib/dataSource";
import { getDb } from "@/mocks/db";
import type { TenantEntity } from "@/types/domain";

let tenants: TenantEntity[] = [];

export function setTenantRegistry(next: TenantEntity[]): void {
  tenants = next;
}

/**
 * Every tenant this session may see.
 *
 * Falls back to the seed database in the mock build, and only there: the first
 * render happens before the layout's query resolves, and a scope computed from
 * an empty list would briefly filter every screen to nothing. The API build has
 * no such fallback available, so it renders an empty switcher for that instant
 * instead of a wrong one.
 */
export function tenantRegistry(): TenantEntity[] {
  if (tenants.length > 0) return tenants;
  return usesApi ? [] : getDb().tenants;
}
