/**
 * The dashboard adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { dashboardApiMock } from "./dashboardApi.mock";
import { dashboardApiHttp } from "./dashboardApi.http";
import type { DashboardApi } from "./contract";

const api: DashboardApi = pick(dashboardApiMock, dashboardApiHttp);

export const getKpiSummary = api.getKpiSummary.bind(api);
export const getMonthlyChart = api.getMonthlyChart.bind(api);
export const getOutletShares = api.getOutletShares.bind(api);
export const getRecentActivities = api.getRecentActivities.bind(api);
export const getDispatchRail = api.getDispatchRail.bind(api);
export const getRecentAudit = api.getRecentAudit.bind(api);
