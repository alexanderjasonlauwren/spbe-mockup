/**
 * What every settings adapter must provide.
 *
 * Same reason as the users and tenancy contracts: without one the two
 * implementations drift, and the build breaks only in whichever page happens to
 * read the field that diverged.
 *
 * **Adapters return domain types.** The wire shape never escapes the HTTP
 * adapter.
 */
import type { ResolvedSettingsEntity, SettingsEntity } from "@/types/domain";
import type { InheritableFieldKey } from "./fields";

export interface SettingsApi {
  /** The acting tenant's effective settings — what applies, after inheritance. */
  getSettings(): Promise<SettingsEntity>;
  /**
   * The same, with provenance: own, effective and where each inherited field
   * came from. A form needs all three — saving from `effective` alone turns
   * every inherited value into an override.
   */
  getSettingsDetail(): Promise<ResolvedSettingsEntity>;
  /** Writes ONLY the fields supplied. Absent fields keep inheriting. */
  updateSettings(patch: Partial<SettingsEntity>): Promise<SettingsEntity>;
  /** Removes an override so the field follows its parent again. */
  clearSettingOverride(field: InheritableFieldKey): Promise<void>;
}
