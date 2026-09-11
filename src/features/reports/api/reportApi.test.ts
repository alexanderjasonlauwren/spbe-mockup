import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The HTTP adapter's mapping from the real /deliveries, /payments and
 * /invoices lists onto the console's report shapes, following
 * financeApi.test.ts's own pattern.
 */

const getList = vi.fn();
vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  getOne: vi.fn(),
  send: vi.fn(),
  upload: vi.fn(),
}));

const getOutletList = vi.fn();
vi.mock("@/features/outlet/api/outletApi", () => ({
  getOutletList: (...args: unknown[]) => getOutletList(...args),
}));

const getVehicles = vi.fn();
vi.mock("@/features/vehicles/api/vehicleApi", () => ({
  getVehicles: (...args: unknown[]) => getVehicles(...args),
}));

const getSettings = vi.fn();
vi.mock("@/features/settings/api/settingsApi", () => ({
  getSettings: (...args: unknown[]) => getSettings(...args),
}));

const exportCsv = vi.fn();
const printDocument = vi.fn();
vi.mock("@/lib/export", () => ({
  exportCsv: (...args: unknown[]) => exportCsv(...args),
  printDocument: (...args: unknown[]) => printDocument(...args),
  timestampSuffix: () => "20260911-2300",
}));

const { reportApiHttp } = await import("./reportApi.http");
const { resolveRange } = await import("./contract");

const OUTLET_ID = "11111111-1111-4111-8111-111111111111";
const DRIVER_ID = "22222222-2222-4222-8222-222222222222";
const VEHICLE_ID = "33333333-3333-4333-8333-333333333333";

function delivery(overrides: Record<string, unknown> = {}) {
  return {
    outlet_id: OUTLET_ID,
    driver_id: DRIVER_ID,
    driver_name: "Budi",
    vehicle_id: VEHICLE_ID,
    plate: "H 1234 AB",
    dispatched_qty: 100,
    delivered_qty: 90,
    delivery_status: "delivered",
    created_at: "2026-09-05T08:00:00+07:00",
    ...overrides,
  };
}

beforeEach(() => {
  getList.mockReset();
  getOutletList.mockReset().mockResolvedValue([
    { id: OUTLET_ID, nama: "Pangkalan Ahmad", kecamatan: "Sidorejo" },
  ]);
  getVehicles.mockReset().mockResolvedValue([
    { id: VEHICLE_ID, armada: "Isuzu Elf NMR" },
  ]);
  getSettings.mockReset().mockResolvedValue({ namaPerusahaan: "—", nomorAgen: "—" });
  exportCsv.mockReset();
  printDocument.mockReset();
});

/** Routes each fetch to the fixture matching the endpoint it targets. */
function mockLists(opts: {
  deliveries?: unknown[];
  payments?: unknown[];
  invoices?: unknown[];
}) {
  getList.mockImplementation((path: string) => {
    if (path === "/deliveries") return Promise.resolve({ items: opts.deliveries ?? [] });
    if (path === "/payments") return Promise.resolve({ items: opts.payments ?? [] });
    if (path === "/invoices") return Promise.resolve({ items: opts.invoices ?? [] });
    throw new Error(`unexpected path: ${path}`);
  });
}

describe("getReportSummary", () => {
  it("derives every figure from dispatched/delivered_qty and the wire's own statuses", async () => {
    mockLists({
      deliveries: [
        delivery({ delivery_status: "delivered" }),
        delivery({ delivery_status: "pending", dispatched_qty: 50, delivered_qty: 0 }),
      ],
      payments: [
        { outlet_id: OUTLET_ID, amount: 500_000, payment_date: "2026-09-05", payment_status: "verified" },
        { outlet_id: OUTLET_ID, amount: 200_000, payment_date: "2026-09-05", payment_status: "rejected" },
        // Outside the window -- must not be counted.
        { outlet_id: OUTLET_ID, amount: 999_999, payment_date: "2020-01-01", payment_status: "verified" },
      ],
      invoices: [
        { outlet_id: OUTLET_ID, total_amount: 100_000, outstanding_amount: 40_000, issued_at: "2026-09-05" },
        { outlet_id: OUTLET_ID, total_amount: 1, outstanding_amount: 1, issued_at: "2020-01-01" },
      ],
    });

    const summary = await reportApiHttp.getReportSummary("7h");

    expect(summary.unitTerkirim).toBe(90);
    expect(summary.unitTarget).toBe(150);
    expect(summary.pencapaian).toBeCloseTo((90 / 150) * 100);
    expect(summary.pendapatan).toBe(500_000);
    expect(summary.ditolak).toBe(200_000);
    expect(summary.piutang).toBe(40_000);
    expect(summary.suratJalan).toBe(2);
    expect(summary.suratJalanSelesai).toBe(1);
    expect(summary.suratJalanTertunda).toBe(1);
    expect(summary.outletDilayani).toBe(1);
  });

  it("counts neither partial, failed nor cancelled deliveries as Selesai or Tertunda", async () => {
    mockLists({
      deliveries: [
        delivery({ delivery_status: "partial" }),
        delivery({ delivery_status: "failed" }),
        delivery({ delivery_status: "cancelled" }),
      ],
      payments: [],
      invoices: [],
    });

    const summary = await reportApiHttp.getReportSummary("7h");

    expect(summary.suratJalan).toBe(3);
    expect(summary.suratJalanSelesai).toBe(0);
    expect(summary.suratJalanTertunda).toBe(0);
  });

  it("passes the resolved range as a date filter on /deliveries", async () => {
    mockLists({ deliveries: [], payments: [], invoices: [] });
    await reportApiHttp.getReportSummary("7h");

    const window = resolveRange("7h");
    const [, params] = getList.mock.calls.find(([path]) => path === "/deliveries")!;
    expect(params.filters).toEqual(
      expect.arrayContaining([
        { field: "date", operator: "gte", value: window.from },
        { field: "date", operator: "lte", value: window.to },
      ]),
    );
  });
});

describe("getDailySeries", () => {
  it("buckets deliveries and verified payments by their own day", async () => {
    const window = resolveRange("7h");
    mockLists({
      deliveries: [delivery({ created_at: `${window.to}T10:00:00+07:00` })],
      payments: [
        { outlet_id: OUTLET_ID, amount: 300_000, payment_date: window.to, payment_status: "verified" },
        { outlet_id: OUTLET_ID, amount: 999, payment_date: window.to, payment_status: "pending" },
      ],
      invoices: [],
    });

    const series = await reportApiHttp.getDailySeries("7h");
    const last = series[series.length - 1];

    expect(last.tanggal).toBe(window.to);
    expect(last.target).toBe(100);
    expect(last.realisasi).toBe(90);
    expect(last.pendapatan).toBe(300_000);
  });
});

describe("getTopOutlet", () => {
  it("sums delivered_qty and invoice totals per outlet, joined to outlet names", async () => {
    mockLists({
      deliveries: [delivery(), delivery({ delivered_qty: 10 })],
      payments: [],
      invoices: [
        { outlet_id: OUTLET_ID, total_amount: 250_000, outstanding_amount: 0, issued_at: "2026-09-05" },
      ],
    });

    const [row] = await reportApiHttp.getTopOutlet("7h");

    expect(row.nama).toBe("Pangkalan Ahmad");
    expect(row.kecamatan).toBe("Sidorejo");
    expect(row.unit).toBe(100);
    expect(row.suratJalan).toBe(2);
    expect(row.nilai).toBe(250_000);
  });
});

describe("getDriverPerformance", () => {
  it("joins the driver's own name/plate off the delivery row and the vehicle's armada by id", async () => {
    mockLists({
      deliveries: [
        delivery({ delivery_status: "delivered" }),
        delivery({ delivery_status: "pending", delivered_qty: 0 }),
      ],
      payments: [],
      invoices: [],
    });

    const [row] = await reportApiHttp.getDriverPerformance("7h");

    expect(row.nama).toBe("Budi");
    expect(row.plat).toBe("H 1234 AB");
    expect(row.armada).toBe("Isuzu Elf NMR");
    expect(row.suratJalan).toBe(2);
    expect(row.selesai).toBe(1);
    expect(row.tertunda).toBe(1);
    expect(row.ketepatan).toBe(50);
  });
});

describe("exportReport and printReport", () => {
  it("exportReport writes one CSV row per day in the range", async () => {
    mockLists({ deliveries: [], payments: [], invoices: [] });
    const count = await reportApiHttp.exportReport("7h");
    expect(exportCsv).toHaveBeenCalledOnce();
    expect(count).toBe(7);
  });

  it("printReport reads the real settings placeholder rather than inventing a company name", async () => {
    mockLists({ deliveries: [], payments: [], invoices: [] });
    await reportApiHttp.printReport("7h");
    expect(printDocument).toHaveBeenCalledOnce();
    const [, html] = printDocument.mock.calls[0];
    expect(html).toContain("—");
  });
});
