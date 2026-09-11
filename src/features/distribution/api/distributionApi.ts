/**
 * The distribution planning adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { assertMockAllowed, pick } from "@/lib/dataSource";
import {
  addApprovedOrders as addApprovedOrdersMock,
  distributionApiMock,
  printRouteSheet as printRouteSheetMock,
} from "./distributionApi.mock";
import {
  addApprovedOrders as addApprovedOrdersHttp,
  distributionApiHttp,
} from "./distributionApi.http";
import type { DistributionApi } from "./contract";

const api: DistributionApi = pick(distributionApiMock, distributionApiHttp);

export const getPlanList = api.getPlanList.bind(api);
export const getPlan = api.getPlan.bind(api);
export const getPlanDetail = api.getPlanDetail.bind(api);
export const createPlan = api.createPlan.bind(api);
export const saveDraft = api.saveDraft.bind(api);
export const confirmPlan = api.confirmPlan.bind(api);
export const cancelDistributionPlan = api.cancelDistributionPlan.bind(api);
export const getOutletOptions = api.getOutletOptions.bind(api);
export const getProductOptions = api.getProductOptions.bind(api);
export const getDefaultProductId = api.getDefaultProductId.bind(api);
export const getDriverOptions = api.getDriverOptions.bind(api);
export const getVehicleOptions = api.getVehicleOptions.bind(api);
export const getActiveSaOptions = api.getActiveSaOptions.bind(api);
export const suggestAssignment = api.suggestAssignment.bind(api);
export const applyAssignment = api.applyAssignment.bind(api);

/**
 * Scheduling approved orders onto a plan, real now that `core.orders` has a
 * module to serve it (D3 B-Step 2). `addApprovedOrdersHttp` is not a second
 * implementation of this -- it calls straight into `orderApi.http.ts`'s own
 * `scheduleOneOrder`, so there is exactly one place this request is made.
 */
export const addApprovedOrders = pick(addApprovedOrdersMock, addApprovedOrdersHttp);

/**
 * The route sheet is mock-only for a narrower reason: it prints an address and
 * a delivery time per stop, and neither is on the order-item response. Printing
 * a sheet with "—" where the driver needs the address is worse than saying the
 * sheet is not ready.
 */
export async function printRouteSheet(planId: string) {
  assertMockAllowed("distribution.printRouteSheet");
  return printRouteSheetMock(planId);
}
