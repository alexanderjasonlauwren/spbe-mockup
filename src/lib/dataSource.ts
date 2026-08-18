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
