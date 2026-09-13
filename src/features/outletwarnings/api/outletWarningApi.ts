/**
 * The outlet-warning adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { outletWarningApiMock } from "./outletWarningApi.mock";
import { outletWarningApiHttp } from "./outletWarningApi.http";
import type { OutletWarningApi } from "./contract";

export type { OutletWarningView } from "./contract";

const api: OutletWarningApi = pick(outletWarningApiMock, outletWarningApiHttp);

export const getOutletWarnings = api.getOutletWarnings.bind(api);
export const createOutletWarning = api.createOutletWarning.bind(api);
