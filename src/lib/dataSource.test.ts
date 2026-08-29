import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The build selector, and the guard that stops a half-wired API build from
 * presenting invented figures as real ones.
 *
 * `usesApi` is read from an env var at module load, so each case re-imports the
 * module with a different value rather than mutating one. vi.resetModules is
 * what makes that honest -- without it the second import returns the first
 * module's cached constant and every case tests the same build.
 */
async function loadWith(source: string | undefined) {
  vi.resetModules();
  vi.stubEnv("VITE_DATA_SOURCE", source ?? "");
  return import("./dataSource");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("the data source selector", () => {
  // Mock is the default, deliberately: an unset or misspelled variable falls
  // back to the source that always works. A demo silently pointed at an
  // unreachable API is the worse failure, because it only shows up in front of
  // a client.
  it.each([undefined, "", "API", "rest", "mokc"])(
    "falls back to mock for %o",
    async (value) => {
      const { DATA_SOURCE, usesApi } = await loadWith(value);
      expect(DATA_SOURCE).toBe("mock");
      expect(usesApi).toBe(false);
    },
  );

  it("selects the API only for exactly \"api\"", async () => {
    const { DATA_SOURCE, usesApi } = await loadWith("api");
    expect(DATA_SOURCE).toBe("api");
    expect(usesApi).toBe(true);
  });

  it("picks the implementation matching the build", async () => {
    const mock = await loadWith("mock");
    expect(mock.pick("mock-impl", "http-impl")).toBe("mock-impl");

    const api = await loadWith("api");
    expect(api.pick("mock-impl", "http-impl")).toBe("http-impl");
  });
});

describe("assertMockAllowed", () => {
  // In the mock build every feature reads the store, so the guard must be
  // invisible. If it ever throws here the demo is dead.
  it("permits a mock read in the mock build", async () => {
    const { assertMockAllowed } = await loadWith("mock");
    expect(() => assertMockAllowed("scopedDb")).not.toThrow();
  });

  // The failure it exists for: fifteen of eighteen feature APIs have no HTTP
  // adapter and read the store directly, so in an API build they served
  // fabricated data beside real data with nothing on screen telling them apart.
  it("refuses a mock read in the API build", async () => {
    const { assertMockAllowed } = await loadWith("api");
    expect(() => assertMockAllowed("scopedDb")).toThrow(/no HTTP adapter/);
  });

  // The message has to be actionable. Someone hitting this is looking at a
  // broken screen and needs to know both ways out of it.
  it("says how to resolve it", async () => {
    const { assertMockAllowed } = await loadWith("api");
    let message = "";
    try {
      assertMockAllowed("scopedDb");
    } catch (e) {
      message = (e as Error).message;
    }

    expect(message).toContain("scopedDb");
    expect(message).toContain("VITE_DATA_SOURCE=mock");
    expect(message).toContain("contract");
  });
});
