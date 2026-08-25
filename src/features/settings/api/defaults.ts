import type { SettingsEntity } from "@/types/domain";
import { seedSettings } from "@/mocks/seed";

/**
 * The console's own defaults, for fields no endpoint owns yet.
 *
 * The backend's tenant_settings covers the lexicon and the operating window.
 * SettingsEntity is wider — numbering, notification rules, theme — and those
 * have no endpoint. Rather than leave them undefined and let a screen render
 * blank, the HTTP adapter merges over these.
 *
 * Sourced from the seed so there is one definition of "default" rather than two
 * that drift. It is the honest shape of the gap: these fields are still mock.
 */
export const DEFAULT_SETTINGS: SettingsEntity = seedSettings();
