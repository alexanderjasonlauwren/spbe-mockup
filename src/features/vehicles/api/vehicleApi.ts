/**
 * The vehicle adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { vehicleApiMock } from "./vehicleApi.mock";
import { vehicleApiHttp } from "./vehicleApi.http";
import type { VehicleApi } from "./contract";

export type { VehicleView } from "./contract";

const api: VehicleApi = pick(vehicleApiMock, vehicleApiHttp);

export const getVehicles = api.getVehicles.bind(api);
export const getVehicleDetail = api.getVehicleDetail.bind(api);
export const createOrUpdateVehicle = api.createOrUpdateVehicle.bind(api);
export const removeVehicle = api.removeVehicle.bind(api);
