/**
 * The system-screen adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { systemApiMock } from "./systemApi.mock";
import { systemApiHttp } from "./systemApi.http";
import type { SystemApi } from "./contract";

export type { SupplierView } from "./contract";

const api: SystemApi = pick(systemApiMock, systemApiHttp);

export const getSupplierList = api.getSupplierList.bind(api);
export const saveSupplier = api.saveSupplier.bind(api);
export const deleteSupplier = api.deleteSupplier.bind(api);
export const getSystemConfig = api.getSystemConfig.bind(api);
export const saveNumbering = api.saveNumbering.bind(api);
export const saveOperations = api.saveOperations.bind(api);
