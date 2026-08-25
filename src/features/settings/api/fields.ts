import type { SettingsEntity } from "@/types/domain";

/**
 * Fields a tenant inherits from its parent when it has not set them.
 *
 * The split follows the backend's two tables. `iam.tenant_settings` inherits per
 * column — how a tenant works and what it calls things is a sensible default for
 * a group to set once. `iam.tenant_profiles` never does: a subsidiary that is
 * its own PT has its own NPWP and agent number, and falling back to its parent's
 * would put the wrong legal identity on an invoice.
 *
 * Identity fields are therefore absent here on purpose, and the settings page
 * gives them no badge.
 *
 * In its own module rather than beside the adapters, because both adapters and
 * the page need it and importing it from one adapter would make the other's
 * dependency graph read as though it went through the first.
 */
export const INHERITABLE_FIELDS = [
  "zonaWaktu",
  "jamOperasionalMulai",
  "jamOperasionalSelesai",
  "targetHarian",
  "istilah",
  "operasi",
] as const satisfies readonly (keyof SettingsEntity)[];

export type InheritableFieldKey = (typeof INHERITABLE_FIELDS)[number];
