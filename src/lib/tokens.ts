/**
 * Where session tokens live.
 *
 * One module so there is a single answer to "where is the token", which matters
 * because that answer is going to change: both tokens sit in localStorage today,
 * where any XSS on the page can read them. The stronger arrangement is an
 * httpOnly cookie for the refresh token, which JavaScript cannot read at all —
 * it needs CSRF handling on the backend, so it is a deliberate follow-up rather
 * than something to half-do here.
 */

const ACCESS_KEY = "auth_token";
const REFRESH_KEY = "refresh_token";

export interface SessionTokens {
  token: string;
  refresh_token: string;
  expires_at?: string;
  refresh_expires_at?: string;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

/**
 * Stores a session.
 *
 * Called on login and on every refresh. Storing the new refresh token is not
 * optional: the server rotates it on every use and revokes the previous one, so
 * keeping the old value means the next refresh presents a dead token — which the
 * server reads as a replay and ends every session in that family.
 */
export function setSessionTokens(tokens: SessionTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearSessionTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
