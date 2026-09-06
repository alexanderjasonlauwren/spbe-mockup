/**
 * The monitoring adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { monitoringApiMock } from "./monitoringApi.mock";
import { monitoringApiHttp } from "./monitoringApi.http";
import type { MonitoringApi } from "./contract";

export type { DateRange, SetDeliveryStatusInput, StatusReceipt } from "./contract";

const api: MonitoringApi = pick(monitoringApiMock, monitoringApiHttp);

export const getMonitoringSnapshot = api.getMonitoringSnapshot.bind(api);
export const getDriverCards = api.getDriverCards.bind(api);
export const getMonitoringTable = api.getMonitoringTable.bind(api);
export const setDeliveryStatus = api.setDeliveryStatus.bind(api);
export const printSuratJalan = api.printSuratJalan.bind(api);
