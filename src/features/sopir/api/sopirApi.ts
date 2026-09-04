/**
 * The driver adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { sopirApiMock } from "./sopirApi.mock";
import { sopirApiHttp } from "./sopirApi.http";
import type { SopirApi } from "./contract";

export type { CompleteStopInput, StopReceipt } from "./contract";

const api: SopirApi = pick(sopirApiMock, sopirApiHttp);

export const getMyRun = api.getMyRun.bind(api);
export const departStop = api.departStop.bind(api);
export const completeStop = api.completeStop.bind(api);
export const holdStop = api.holdStop.bind(api);
export const getDriverOptions = api.getDriverOptions.bind(api);
