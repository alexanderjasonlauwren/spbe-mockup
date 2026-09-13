/**
 * The geofence adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { geofenceApiMock } from "./geofenceApi.mock";
import { geofenceApiHttp } from "./geofenceApi.http";
import type { GeofenceApi } from "./contract";

export type {
  GeofenceAlertView,
  GeofenceRuleInput,
  GeofenceRuleView,
  GeofenceShapeEntity,
  LatLng,
} from "./contract";

const api: GeofenceApi = pick(geofenceApiMock, geofenceApiHttp);

export const getGeofenceRules = api.getGeofenceRules.bind(api);
export const createOrUpdateGeofenceRule = api.createOrUpdateGeofenceRule.bind(api);
export const removeGeofenceRule = api.removeGeofenceRule.bind(api);
export const getGeofenceAlerts = api.getGeofenceAlerts.bind(api);
export const setGeofenceAlertStatus = api.setGeofenceAlertStatus.bind(api);
