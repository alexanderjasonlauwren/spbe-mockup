/**
 * The settings data source, chosen at build time.
 */
import { usesApi } from "@/lib/dataSource";

import type { SettingsApi } from "./contract";
import * as httpApi from "./settingsApi.http";
import * as mockApi from "./settingsApi.mock";

// Compile-time proof both adapters satisfy the contract.
const _conformance: [SettingsApi, SettingsApi] = [mockApi, httpApi];
void _conformance;

export const getSettings = usesApi ? httpApi.getSettings : mockApi.getSettings;
export const getSettingsDetail = usesApi ? httpApi.getSettingsDetail : mockApi.getSettingsDetail;
export const updateSettings = usesApi ? httpApi.updateSettings : mockApi.updateSettings;
export const clearSettingOverride = usesApi
  ? httpApi.clearSettingOverride
  : mockApi.clearSettingOverride;

// Mock-only: exporting, resetting and advancing the simulated day are properties
// of the demo database, not of any tenant. Named here rather than hidden, so the
// gap is visible from the switch.
export const exportData = mockApi.exportData;
export const resetData = mockApi.resetData;
