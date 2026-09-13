/**
 * What every auth adapter must provide.
 *
 * Same reason as `features/users/api/contract.ts`: without a contract the mock
 * and the HTTP adapter drift, and the drift only shows up in whichever screen
 * happens to read the field one of them forgot.
 *
 * **Adapters return domain types.** `SessionResult` is the console's shape, not
 * the wire's — the backend's `SessionResponse` never escapes the HTTP adapter.
 */
import type { User } from "@/types/auth";

/** The tenant a session is acting as. */
export interface SessionTenant {
  id: number;
  code: string;
  name: string;
}

export interface SessionResult {
  user: User;
  tenant: SessionTenant | null;
  /** The access token. Stored by the caller, not by the adapter. */
  token: string;
}

export interface AuthApi {
  /**
   * Exchanges credentials for a session.
   *
   * Returns the user and their permissions, which costs a second request
   * against the API: login answers with tokens only, and who-you-are comes from
   * the session endpoint. Both happen here so no caller has to know that.
   */
  login(email: string, password: string): Promise<SessionResult>;

  /**
   * Re-reads the current session from the stored token.
   *
   * Needed on every page load: the token survives a refresh in localStorage but
   * the permission set does not travel in it, deliberately — grants live in the
   * database so a revoked role stops authorising immediately rather than when
   * the token happens to expire.
   */
  session(): Promise<SessionResult>;

  /**
   * Ends the session server-side.
   *
   * Must not throw on a token the server has already forgotten: logging out is
   * how a user recovers from a broken session, so it has to work when the
   * session is broken.
   */
  logout(): Promise<void>;
}
