import { describe, expect, it } from "vitest";

import { describeAccess, describeRoles } from "./access";
import { PERMISSIONS } from "./permissions";
import { navGroupsFor, landingPathFor, usesDriverConsole } from "@/layouts/nav";

describe("describeRoles", () => {
  // The whole reason this replaced ROLE_LABEL[role]: a person can hold several,
  // and the old lookup had to pick one.
  it("lists every role, not just the first", () => {
    expect(describeRoles(["Finance", "Dispatcher"])).toBe("Finance, Dispatcher");
  });

  // No roles is a real state — a user created but not yet granted anything — and
  // must not render as a role they do not have.
  it("says so when there are none", () => {
    expect(describeRoles([])).toBe("Belum ada peran");
    expect(describeRoles()).toBe("Belum ada peran");
  });

  // The names are the tenant's own words, from the server. Translating them
  // would show a role that does not exist in their configuration.
  it("shows names as given rather than translating them", () => {
    expect(describeRoles(["Kepala Cabang"])).toBe("Kepala Cabang");
  });
});

describe("describeAccess", () => {
  it("says plainly when someone can do nothing yet", () => {
    expect(describeAccess([])).toContain("Belum ada akses");
  });

  // A read-only user must not be told they can change things. This is the case
  // ROLE_SUMMARY got right by hand and would have got wrong the first time a
  // "viewer" role was granted one write permission.
  it("recognises read-only access", () => {
    const summary = describeAccess([
      PERMISSIONS.SA_VIEW,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
    ]);
    expect(summary).toContain("Hanya membaca");
  });

  // One write permission among reads is no longer read-only, and the sentence
  // has to follow the grants rather than the label someone attached to them.
  it("stops calling it read-only as soon as one write is granted", () => {
    const summary = describeAccess([PERMISSIONS.SA_VIEW, PERMISSIONS.PAYMENTS_VERIFY]);
    expect(summary).not.toContain("Hanya membaca");
  });

  it("recognises full administrative access", () => {
    expect(describeAccess(Object.values(PERMISSIONS))).toContain("Akses penuh");
  });
});

describe("the driver console", () => {
  // A sopir landing on the dashboard opens the console on a dispatch rail of
  // trucks that are not theirs, with their own run two taps away.
  it("is where someone who may only record deliveries lands", () => {
    const driver = [PERMISSIONS.DELIVERIES_EXECUTE];

    expect(usesDriverConsole(driver)).toBe(true);
    expect(landingPathFor(driver)).toBe("/sopir");
    expect(navGroupsFor(driver)).not.toEqual(navGroupsFor([PERMISSIONS.SA_VIEW]));
  });

  // The case a role name got wrong the moment anyone held two. A dispatcher who
  // can also execute deliveries needs the whole console, and asking
  // `role === "driver"` would have taken it away from them.
  it("is not where someone who can execute deliveries AND plan them lands", () => {
    const dispatcher = [PERMISSIONS.DELIVERIES_EXECUTE, PERMISSIONS.DISTRIBUTION_EDIT];

    expect(usesDriverConsole(dispatcher)).toBe(false);
    expect(landingPathFor(dispatcher)).toBe("/dashboard");
  });

  // Fails open to the full console rather than trapping someone in the driver
  // view: an unknown session is better served a dashboard it may not fill than
  // a screen built for one run it does not have.
  it("is not where an unknown session lands", () => {
    expect(usesDriverConsole()).toBe(false);
    expect(usesDriverConsole([])).toBe(false);
    expect(landingPathFor(undefined)).toBe("/dashboard");
  });
});
