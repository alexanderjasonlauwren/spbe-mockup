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
const upload = vi.fn();

vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  getOne: (...args: unknown[]) => getOne(...args),
  send: (...args: unknown[]) => send(...args),
  upload: (...args: unknown[]) => upload(...args),
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
  upload.mockReset();
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

describe("mapping an import's diff onto the domain", () => {
  const file = new File(["tanggal,target\n"], "SA-Agustus-rev2.csv", {
    type: "text/csv",
  });

  function parsed(diff: Record<string, unknown> = {}) {
    return {
      id: "22222222-2222-4222-8222-222222222222",
      status: "parsed",
      schedule_agreement_id: "11111111-1111-4111-8111-111111111111",
      file_name: "SA-Agustus-rev2.csv",
      checksum_sha256: "abc123",
      diff: {
        changes: [],
        issues: [],
        new: 0,
        updated: 0,
        unchanged: 0,
        skipped: 0,
        ...diff,
      },
    };
  }

  it("posts the file as multipart to the agreement's import route", async () => {
    upload.mockResolvedValue(parsed());

    await saApiHttp.parseImport("11111111-1111-4111-8111-111111111111", file);

    expect(upload).toHaveBeenCalledWith(
      "/schedule-agreements/11111111-1111-4111-8111-111111111111/imports",
      file,
    );
  });

  it("translates the three change words", async () => {
    upload.mockResolvedValue(
      parsed({
        changes: [
          { date: "2026-09-01", change: "unchanged", to: 350 },
          { date: "2026-09-02", change: "updated", from: 350, to: 300 },
          { date: "2026-09-03", change: "new", to: 400 },
        ],
        new: 1,
        updated: 1,
        unchanged: 1,
      }),
    );

    const batch = await saApiHttp.parseImport("sa-1", file);

    expect(batch.diff.perubahan.map((c) => c.jenis)).toEqual([
      "tetap",
      "berubah",
      "baru",
    ]);
    expect(batch.diff.perubahan[1]).toEqual({
      tanggal: "2026-09-02",
      jenis: "berubah",
      dari: 350,
      menjadi: 300,
    });
    // A new date has no previous value. Undefined, never 0 — a zero would read
    // as a stated obligation of nothing, which is a different claim.
    expect(batch.diff.perubahan[2].dari).toBeUndefined();
    expect(batch.diff).toMatchObject({ baru: 1, berubah: 1, tetap: 1 });
  });

  it("keeps a change it does not recognise rather than dropping it", async () => {
    // A row the console cannot classify still moves a number, and hiding it
    // would understate what applying the file does.
    upload.mockResolvedValue(
      parsed({ changes: [{ date: "2026-09-01", change: "reinstated", to: 350 }] }),
    );

    const batch = await saApiHttp.parseImport("sa-1", file);

    expect(batch.diff.perubahan).toHaveLength(1);
    expect(batch.diff.perubahan[0].jenis).toBe("berubah");
  });

  it("passes the parser's own words through for an unreadable line", async () => {
    upload.mockResolvedValue(
      parsed({
        issues: [{ line: 4, value: "kemarin", reason: "not a date the parser recognises" }],
        skipped: 1,
      }),
    );

    const batch = await saApiHttp.parseImport("sa-1", file);

    expect(batch.diff.masalah).toEqual([
      { baris: 4, nilai: "kemarin", alasan: "not a date the parser recognises" },
    ]);
    expect(batch.diff.dilewati).toBe(1);
  });

  it("survives a diff with no arrays at all", async () => {
    // Go marshals an empty slice as null, so a file that changed nothing and
    // broke nothing arrives with both lists absent.
    upload.mockResolvedValue(
      parsed({ changes: undefined, issues: undefined }),
    );

    const batch = await saApiHttp.parseImport("sa-1", file);

    expect(batch.diff.perubahan).toEqual([]);
    expect(batch.diff.masalah).toEqual([]);
  });

  it("reports what applying actually wrote", async () => {
    send.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      status: "applied",
      rows_written: 31,
    });

    const applied = await saApiHttp.applyImport("22222222-2222-4222-8222-222222222222");

    expect(send).toHaveBeenCalledWith(
      "post",
      "/imports/22222222-2222-4222-8222-222222222222/apply",
    );
    expect(applied.barisDitulis).toBe(31);
  });
});
