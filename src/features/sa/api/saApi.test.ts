import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * The HTTP adapter's mapping, which is where the two sources drift.
 *
 * The wire shape and the domain model disagree on language, on status
 * vocabulary and on what "remaining" means. None of that is visible from a
 * screen until a number is wrong, so it is asserted here.
 */

const getList = vi.fn();
const getOne = vi.fn();
const send = vi.fn();

vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  getOne: (...args: unknown[]) => getOne(...args),
  send: (...args: unknown[]) => send(...args),
}));

const { saApiHttp } = await import("./saApi.http");

function wire(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    sa_number: "SA-2026-09-001",
    agreement_type: "base",
    is_time_limited: false,
    supplier_name: "SPBE Salatiga",
    period_start: "2026-09-01",
    period_end: "2026-09-30",
    sa_status: "active",
    is_lapsed: false,
    source: "manual",
    total_quota_qty: 80000,
    allocated_quota_qty: 55000,
    used_quota_qty: 33000,
    version: 1,
    created_at: "2026-08-30T02:00:00Z",
    updated_at: "2026-08-30T02:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  getList.mockReset();
  getOne.mockReset();
  send.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("mapping the wire shape onto the domain", () => {
  it("carries the quota numbers across", async () => {
    getList.mockResolvedValue({ items: [wire()], pagination: {} });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.totalKuota).toBe(80000);
    expect(sa.sudahDidistribusikan).toBe(33000);
  });

  // Remaining is measured against what has been USED, not what has been
  // allocated. An allocation is a promise; a delivery is a cylinder that has
  // left the yard, and only the second one reduces what is actually left.
  it("computes remaining from used, not from allocated", async () => {
    getList.mockResolvedValue({ items: [wire()], pagination: {} });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.sisaKuota).toBe(80000 - 33000);
  });

  // Never negative. Over-delivery is possible in the data and a negative
  // "remaining" on screen reads as a display bug rather than as the problem it
  // actually is.
  it("never reports a negative remainder", async () => {
    getList.mockResolvedValue({
      items: [wire({ total_quota_qty: 100, used_quota_qty: 150 })],
      pagination: {},
    });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.sisaKuota).toBe(0);
  });

  // "Limit" is derived here and has no backend state, because it is arithmetic
  // rather than a lifecycle step — storing it would need something to flip it
  // the moment an allocation changed.
  it("derives Limit from an agreement whose quota is fully spoken for", async () => {
    getList.mockResolvedValue({
      items: [wire({ allocated_quota_qty: 80000 })],
      pagination: {},
    });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.status).toBe("Limit");
  });

  // Only an active agreement can be at its limit. A draft with quota already
  // allocated is still a draft — nothing has been committed to.
  it("does not call a draft Limit", async () => {
    getList.mockResolvedValue({
      items: [wire({ sa_status: "draft", allocated_quota_qty: 80000 })],
      pagination: {},
    });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.status).toBe("Draft");
  });

  it.each([
    ["draft", "Draft"],
    ["active", "Aktif"],
    ["completed", "Selesai"],
    // A superseded agreement is finished from the agent's point of view: the
    // replacement is the live one.
    ["amended", "Selesai"],
  ])("maps %s onto %s", async (wireStatus, domain) => {
    getList.mockResolvedValue({
      items: [wire({ sa_status: wireStatus, allocated_quota_qty: 0 })],
      pagination: {},
    });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.status).toBe(domain);
  });

  // An unrecognised status must not crash a list. A backend that gains a
  // lifecycle step should show the row conservatively rather than blank the
  // screen.
  it("falls back rather than throwing on an unknown status", async () => {
    getList.mockResolvedValue({
      items: [wire({ sa_status: "something_new" })],
      pagination: {},
    });

    const [sa] = await saApiHttp.getSAList();
    expect(sa.status).toBe("Draft");
  });

  // The backend publishes HOW a figure arrived, not who typed it. That is the
  // more useful of the two: a figure the supplier stated and one the system
  // derived settle an argument differently.
  it("reports the provenance rather than inventing an uploader", async () => {
    getList.mockResolvedValue({ items: [wire()], pagination: {} });
    const [manual] = await saApiHttp.getSAList();
    expect(manual.diunggahOleh).toBe("Entri manual");

    getList.mockResolvedValue({
      items: [wire({ source: "file_import" })],
      pagination: {},
    });
    const [imported] = await saApiHttp.getSAList();
    expect(imported.diunggahOleh).toBe("file_import");
  });
});

describe("activation", () => {
  // The version is read first and echoed back. Sending a stale one is how two
  // people both believe they activated an agreement.
  it("reads the current version before activating", async () => {
    getOne.mockResolvedValue(wire({ version: 7, sa_status: "draft" }));
    send.mockResolvedValue(wire({ version: 8, sa_status: "active" }));

    await saApiHttp.activateSA("11111111-1111-4111-8111-111111111111");

    expect(getOne).toHaveBeenCalledBefore(send);
    expect(send).toHaveBeenCalledWith(
      "post",
      expect.stringContaining("/activate"),
      { version: 7 },
    );
  });
});

describe("the supplier list", () => {
  // Derived from existing agreements: the backend has no supplier table, and
  // inventing one to populate a dropdown would be a table nobody maintains.
  it("is the distinct suppliers already recorded, sorted", async () => {
    getList.mockResolvedValue({
      items: [
        wire({ supplier_name: "SPBE Ungaran" }),
        wire({ supplier_name: "SPBE Salatiga" }),
        wire({ supplier_name: "SPBE Salatiga" }),
        wire({ supplier_name: undefined }),
      ],
      pagination: {},
    });

    expect(await saApiHttp.getSupplierOptions()).toEqual([
      "SPBE Salatiga",
      "SPBE Ungaran",
    ]);
  });
});
