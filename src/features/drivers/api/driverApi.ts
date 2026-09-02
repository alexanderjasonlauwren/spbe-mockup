/**
 * The driver adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { assertMockAllowed, pick } from "@/lib/dataSource";
import { driverApiMock, getDriverSchedule as getDriverScheduleMock } from "./driverApi.mock";
import { driverApiHttp } from "./driverApi.http";
import type { DriverApi } from "./contract";

export type { DriverView } from "./contract";

const api: DriverApi = pick(driverApiMock, driverApiHttp);

export const getDrivers = api.getDrivers.bind(api);
export const getDriverDetail = api.getDriverDetail.bind(api);
export const createOrUpdateDriver = api.createOrUpdateDriver.bind(api);
export const removeDriver = api.removeDriver.bind(api);
export const exportDrivers = api.exportDrivers.bind(api);

/**
 * Today's stop list for one driver is mock-only, and says so.
 *
 * It reads `core.deliveries`, which dispatch writes when a trip goes out and
 * nothing serves. The dispatch board answers the neighbouring question — which
 * stops are on which run — but it is keyed by plan rather than by driver, and
 * pretending the two are the same would put a different day's stops on this
 * page.
 */
export async function getDriverSchedule(id: string) {
  assertMockAllowed("driver.getDriverSchedule");
  return getDriverScheduleMock(id);
}
