/**
 * Which data source this build talks to.
 *
 * One repository, two builds. The demo deploys with `mock` and is a pure static
 * site — no backend, nothing to break in front of a client. The integration
 * build deploys with `api` and talks to the real service.
 *
 * The alternative was a second repository, and it would have cost far more than
 * it looks: the mock coupling is confined to sixteen feature API files, but a
 * fork duplicates every page, component and layout around them. Each UI change
 * then happens twice, and the demo is the copy nobody runs day to day — so it
 * breaks quietly and you find out during a demo.
 */
export type DataSource = "mock" | "api";

export const DATA_SOURCE: DataSource =
  (import.meta.env.VITE_DATA_SOURCE as DataSource) === "api" ? "api" : "mock";

/**
 * Mock is the default, deliberately.
 *
 * An unset or misspelled variable falls back to the source that always works
 * rather than to one that needs a backend. A demo silently pointed at an
 * unreachable API is a worse failure than a live build silently showing sample
 * data, because the first is visible only when it is too late to fix.
 */
export const usesApi = DATA_SOURCE === "api";

/**
 * Picks an implementation.
 *
 * Both are passed, so the choice is visible at the call site and a feature
 * without an HTTP implementation cannot pretend to have one — it simply does
 * not call this.
 */
export function pick<T>(mock: T, http: T): T {
  return usesApi ? http : mock;
}

/**
 * Refuses a mock read in a build that is supposed to be talking to the API.
 *
 * # The failure this exists to prevent
 *
 * `pick` only helps a feature that HAS both implementations. Fifteen of the
 * console's eighteen feature APIs have only the mock: they import `scopedDb`
 * and read the browser store directly, so they never call `pick` and the
 * selector cannot see them. Built with `VITE_DATA_SOURCE=api`, those fifteen
 * kept serving fabricated data beside three features serving real data, with
 * nothing on screen distinguishing them.
 *
 * That is worse than an outage. An unreachable API shows errors; this showed a
 * complete, plausible console in which the payments were invented — and the
 * whole point of the API build is to check our numbers against reality.
 *
 * # Why it throws rather than warns
 *
 * A console warning is read by whoever opens the console, which is nobody
 * during a demo. Throwing surfaces on the screen that has the problem: React
 * Query catches it and renders that page's error state, so the features that
 * ARE wired keep working and each one that is not says why. Failing closed is
 * also the only safe direction — the alternative is presenting invented
 * figures as real ones.
 *
 * This is not a permanent guard. Each feature that gains an HTTP adapter stops
 * calling `scopedDb` and stops reaching this, so the error disappears one
 * feature at a time as the API build becomes real.
 */
export function assertMockAllowed(accessor: string): void {
  if (!usesApi) return;
  throw new Error(
    `${accessor}: this feature has no HTTP adapter, so it can only serve mock ` +
      `data — and this build is configured for the API (VITE_DATA_SOURCE=api). ` +
      `Refusing to show fabricated data as if it came from the server. ` +
      `Give the feature a contract + .http + .mock trio like features/users, ` +
      `or run the console with VITE_DATA_SOURCE=mock.`,
  );
}
