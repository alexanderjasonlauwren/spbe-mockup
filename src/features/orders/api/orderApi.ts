/**
 * The order adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { orderApiMock } from "./orderApi.mock";
import { orderApiHttp } from "./orderApi.http";
import type { OrderApi } from "./contract";

export type { OrderView } from "./contract";

const api: OrderApi = pick(orderApiMock, orderApiHttp);

export const getOrders = api.getOrders.bind(api);
export const getOrderTotals = api.getOrderTotals.bind(api);
export const approveOrder = api.approveOrder.bind(api);
export const declineOrder = api.declineOrder.bind(api);
export const approveOrderBatch = api.approveOrderBatch.bind(api);
export const addOrdersToPlan = api.addOrdersToPlan.bind(api);
export const createOrder = api.createOrder.bind(api);
export const getSchedulablePlans = api.getSchedulablePlans.bind(api);
export const exportOrders = api.exportOrders.bind(api);
