/**
 * The reports adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { reportApiMock } from "./reportApi.mock";
import { reportApiHttp } from "./reportApi.http";
import type { ReportsApi } from "./contract";

export { RANGE_LABEL, resolveRange } from "./contract";
export type {
  DailyPoint,
  DriverPerformanceRow,
  ReportRange,
  ReportSummary,
  TopOutletRow,
} from "./contract";

const api: ReportsApi = pick(reportApiMock, reportApiHttp);

export const getReportSummary = api.getReportSummary.bind(api);
export const getDailySeries = api.getDailySeries.bind(api);
export const getTopOutlet = api.getTopOutlet.bind(api);
export const getDriverPerformance = api.getDriverPerformance.bind(api);
export const exportReport = api.exportReport.bind(api);
export const printReport = api.printReport.bind(api);
