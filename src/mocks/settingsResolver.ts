import type { ID, SettingsEntity, TenantEntity, TenantSettingsEntity } from "@/types/domain";

/**
 * A tenant's settings, resolved up the tree.
 *
 * Per FIELD, not per row. A subsidiary that overrides only its lexicon must
 * still inherit its group's working week, and "nearest row wins entirely" would
 * silently blank everything it did not restate — and make those blanks look
 * chosen.
 *
 * Walks from the tenant upward and takes the first defined value for each field,
 * which is the browser's equivalent of iam.resolved_tenant_settings() ordering
 * by closure distance. `base` is the last resort so the console always has a
 * complete object to render, even for a tenant that has set nothing.
 */
export function resolveSettings(
  base: SettingsEntity,
  rows: TenantSettingsEntity[],
  tenants: TenantEntity[],
  tenantId: ID,
): SettingsEntity {
  const chain: Partial<SettingsEntity>[] = [];
  let current: TenantEntity | undefined = tenants.find((t) => t.id === tenantId);
  // Guarded against a cycle: a malformed seed would otherwise hang the console
  // on first paint, which is a hard failure to diagnose from a blank screen.
  const seen = new Set<ID>();
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    const own = rows.find((r) => r.tenantId === current!.id);
    if (own) chain.push(own.values);
    current = current.indukId
      ? tenants.find((t) => t.id === current!.indukId)
      : undefined;
  }

  // Every field ANY level defines, not just the ones the base happens to have.
  //
  // Iterating base alone silently drops optional fields: the registered-office
  // coordinates are optional on SettingsEntity and absent from the defaults, so
  // a tenant that set them had them resolved away and the form rendered empty.
  // The bug is invisible — the value is stored, and simply never read.
  const fields = new Set<keyof SettingsEntity>(
    Object.keys(base) as (keyof SettingsEntity)[],
  );
  for (const values of chain) {
    for (const key of Object.keys(values) as (keyof SettingsEntity)[]) fields.add(key);
  }

  const resolved = { ...base } as SettingsEntity;
  for (const key of fields) {
    const nearest = chain.find((values) => values[key] !== undefined);
    if (nearest) (resolved[key] as unknown) = nearest[key];
  }
  return resolved;
}
