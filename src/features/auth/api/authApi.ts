/**
 * The auth adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock — see `src/lib/dataSource.ts`.
 */
import { pick } from "@/lib/dataSource";
import { authApiHttp } from "./authApi.http";
import { authApiMock } from "./authApi.mock";
import type { AuthApi } from "./contract";

export const authApi: AuthApi = pick(authApiMock, authApiHttp);
export type { AuthApi, SessionResult, SessionTenant } from "./contract";
