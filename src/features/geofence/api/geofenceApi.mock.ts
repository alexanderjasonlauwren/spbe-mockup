/**
 * Geofencing, against the mock database.
 *
 * The fences are seeded; the alerts are not, and that is the honest state
 * rather than a missing fixture. An alert is raised by the backend's evaluator
 * from a driver's own GPS trail — nothing in the browser produces one, and
 * seeding invented breaches would put a name against a driver who did not
 * commit one. The panel says so instead.
 */
import { latency } from "@/mocks/db";
import { scopedDb } from "@/mocks/scope";
import {
  deleteGeofenceRule,
  saveGeofenceRule,
  setGeofenceAlertStatus as setStatus,
} from "@/mocks/rules";
import type {
  GeofenceAlertFilters,
  GeofenceAlertStatusEntity,
  GeofenceAlertView,
  GeofenceApi,
  GeofenceRuleInput,
  GeofenceRuleView,
} from "./contract";

export const geofenceApiMock: GeofenceApi = {
  async getGeofenceRules(): Promise<GeofenceRuleView[]> {
    await latency("read");
    return scopedDb()
      .geofenceRules.filter((r) => r.aktif)
      .map((r) => ({ ...r }));
  },

  async createOrUpdateGeofenceRule(input: GeofenceRuleInput): Promise<GeofenceRuleView> {
    await latency("write");
    return { ...saveGeofenceRule(input) };
  },

  async removeGeofenceRule(id: string): Promise<void> {
    await latency("write");
    deleteGeofenceRule(id);
  },

  async getGeofenceAlerts(filters?: GeofenceAlertFilters): Promise<GeofenceAlertView[]> {
    await latency("read");
    const rules = new Map(scopedDb().geofenceRules.map((r) => [r.id, r.nama]));
    return scopedDb()
      .geofenceAlerts.filter(
        (a) => !filters?.status || filters.status === "Semua" || a.status === filters.status,
      )
      .map((a) => ({ ...a, ruleName: rules.get(a.ruleId) }))
      .sort((a, b) => b.terdeteksi.localeCompare(a.terdeteksi));
  },

  async setGeofenceAlertStatus(input: {
    id: string;
    status: Exclude<GeofenceAlertStatusEntity, "Terbuka">;
    catatan?: string;
  }): Promise<GeofenceAlertView> {
    await latency("write");
    return { ...setStatus(input.id, input.status, input.catatan) };
  },
};
