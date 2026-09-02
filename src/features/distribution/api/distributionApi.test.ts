import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The HTTP adapter's mapping, which is where the two sources drift.
 *
 * The wire shape and the domain model disagree on language, on status
 * vocabulary, and — most consequentially here — on what a "stop" is: the
 * service stores a line per (outlet, product) because that is what quota is
 * drawn against, while the planning screen shows one stop per outlet. None of
 * that is visible from a screen until a number is wrong, so it is asserted here.
 */

const getList = vi.fn();
const getOne = vi.fn();
const send = vi.fn();

vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  getOne: (...args: unknown[]) => getOne(...args),
  send: (...args: unknown[]) => send(...args),
  upload: vi.fn(),
}));

const { distributionApiHttp } = await import("./distributionApi.http");

const PLAN_ID = "11111111-1111-4111-8111-111111111111";
const SA_ID = "22222222-2222-4222-8222-222222222222";
const OUTLET_A = "33333333-3333-4333-8333-333333333333";
const OUTLET_B = "44444444-4444-4444-8444-444444444444";

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    outlet_id: OUTLET_A,
    outlet_code: "PKL-001",
    outlet_name: "Pangkalan Ahmad",
    product_id: "66666666-6666-4666-8666-666666666666",
    product_code: "LPG-003",
    product_name: "LPG 3 Kg",
    quota_allocation_id: "77777777-7777-4777-8777-777777777777",
    agreement_id: SA_ID,
    agreement_number: "SA-2026-09-001",
    planned_qty: 30,
    assigned: false,
    payment_method: "cash",
    payment_state: "unpaid",
    item_status: "pending",
    ...overrides,
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAN_ID,
    order_number: "RD-SLT-20260905-0001",
    order_date: "2026-09-01",
    planned_delivery_date: "2026-09-05",
    order_status: "draft",
    total_outlets: 1,
    total_drivers: 0,
    total_qty: 30,
    items: [item()],
    version: 4,
    created_at: "2026-09-01T02:00:00Z",
    updated_at: "2026-09-01T02:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  getList.mockReset();
  getOne.mockReset();
  send.mockReset();
});

describe("plan mapping", () => {
  /**
   * The version has to survive the mapping.
   *
   * Every write echoes it back, and the service refuses a stale one with 409.
   * Dropped here, the console would send whatever it defaulted to and every
   * save would either be refused or — worse, if it defaulted to something that
   * happened to match — overwrite a change it never saw.
   */
  it("carries the version through", async () => {
    getList.mockResolvedValue({ items: [order()], pagination: {} });

    const [plan] = await distributionApiHttp.getPlanList();

    expect(plan.version).toBe(4);
    expect(plan.kode).toBe("RD-SLT-20260905-0001");
    expect(plan.tanggal).toBe("2026-09-05");
  });

  /**
   * A plan spending two agreements names neither.
   *
   * The console's model has one `saId` per plan and the service records one per
   * stop, so the field can only be derived. Picking the first agreement found
   * would put a quota figure on screen that describes part of the plan while
   * looking like it describes all of it.
   */
  it("leaves the agreement blank when the stops do not agree on one", async () => {
    getOne.mockResolvedValue(
      order({
        items: [
          item(),
          item({ id: "x", outlet_id: OUTLET_B, agreement_id: "other", agreement_number: "SA-B" }),
        ],
      }),
    );

    const plan = await distributionApiHttp.getPlan(PLAN_ID);

    expect(plan.saId).toBe("");
    expect(plan.nomorSA).toBe("Beberapa SA");
  });

  it("names the agreement when every stop draws on the same one", async () => {
    getOne.mockResolvedValue(order());

    const plan = await distributionApiHttp.getPlan(PLAN_ID);

    expect(plan.saId).toBe(SA_ID);
    expect(plan.nomorSA).toBe("SA-2026-09-001");
  });

  /** The service's five states, in the console's four words. */
  it("maps in_progress onto Terkonfirmasi rather than inventing a word", async () => {
    getOne.mockResolvedValue(order({ order_status: "in_progress" }));
    expect((await distributionApiHttp.getPlan(PLAN_ID)).status).toBe("Terkonfirmasi");

    getOne.mockResolvedValue(order({ order_status: "cancelled" }));
    expect((await distributionApiHttp.getPlan(PLAN_ID)).status).toBe("Batal");
  });
});

describe("stop mapping", () => {
  /**
   * One outlet taking two products is one stop, not two.
   *
   * The truck visits the pangkalan once. Rendered as two rows the planner sees
   * a route with a duplicate address, assigns them to different drivers, and
   * the schema refuses it — `ex_doi_outlet_one_sequence` exists precisely
   * because an outlet cannot be at two positions on one run.
   */
  it("groups a stop's products into one row", async () => {
    getOne
      .mockResolvedValueOnce(
        order({
          items: [
            item(),
            item({ id: "second", product_id: "p2", product_name: "LPG 12 Kg", planned_qty: 5 }),
          ],
        }),
      )
      .mockRejectedValueOnce(new Error("no board yet"));

    const rows = await distributionApiHttp.getPlanDetail(PLAN_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0].lines).toHaveLength(2);
    expect(rows[0].jumlahUnit).toBe(35);
  });

  /**
   * A cancelled stop is not on the plan any more.
   *
   * The service keeps the row for its quota lineage rather than deleting it, so
   * an adapter that forwarded everything would put stops back on the route that
   * the planner had already dropped — and the truck would be loaded for them.
   */
  it("drops cancelled stops", async () => {
    getOne
      .mockResolvedValueOnce(
        order({ items: [item({ item_status: "cancelled" }), item({ id: "live", outlet_id: OUTLET_B, outlet_name: "Pangkalan Budi" })] }),
      )
      .mockRejectedValueOnce(new Error("no board yet"));

    const rows = await distributionApiHttp.getPlanDetail(PLAN_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0].outlet).toBe("Pangkalan Budi");
  });

  /**
   * Any unpaid line makes the whole stop unpaid.
   *
   * The truck is loaded per stop: the funded half cannot be delivered on its
   * own, so reporting the stop as paid because one of its lines is would tell
   * the planner a stop is clear to load when it is not.
   */
  it("marks a stop unpaid when any of its lines is", async () => {
    getOne
      .mockResolvedValueOnce(
        order({
          items: [
            item({ payment_state: "paid" }),
            item({ id: "second", product_id: "p2", payment_state: "unpaid" }),
          ],
        }),
      )
      .mockRejectedValueOnce(new Error("no board yet"));

    const rows = await distributionApiHttp.getPlanDetail(PLAN_ID);

    expect(rows[0].statusBayar).toBe("Belum Lunas");
  });

  /**
   * The crew comes from the dispatch board, and its absence is not an error.
   *
   * A plan nobody has assigned yet has no board. Failing the read would render
   * an error page for the most ordinary state a draft can be in — so the stops
   * come back with nobody driving them, which is the truth.
   */
  it("renders the stops when there is no board yet", async () => {
    getOne.mockResolvedValueOnce(order()).mockRejectedValueOnce(new Error("no board"));

    const rows = await distributionApiHttp.getPlanDetail(PLAN_ID);

    expect(rows).toHaveLength(1);
    expect(rows[0].driverId).toBeNull();
    expect(rows[0].driver).toBe("Belum ditetapkan");
  });

  it("takes the driver and trip from the board when there is one", async () => {
    getOne.mockResolvedValueOnce(order()).mockResolvedValueOnce({
      trips: [
        {
          trip_no: 2,
          driver_id: "d1",
          driver_code: "DRV-001",
          driver_name: "Slamet",
          vehicle_id: "v1",
          plate: "H 1234 AB",
          stops: [
            { sequence_no: 1, outlet_id: OUTLET_A, outlet_code: "PKL-001", outlet_name: "Pangkalan Ahmad", qty: 30, funded: true },
          ],
          load_qty: 30,
          capacity_qty: 100,
          at_risk_qty: 0,
          distance_m: 4200,
        },
      ],
      unroutable: [],
      summary: { distance_m: 4200, trips: 1, outlets: 1 },
    });

    const rows = await distributionApiHttp.getPlanDetail(PLAN_ID);

    expect(rows[0].driverId).toBe("d1");
    expect(rows[0].driver).toBe("Slamet");
    expect(rows[0].tripNo).toBe(2);
  });
});

describe("saving", () => {
  /**
   * A stop is flattened back into a line per product, each naming the agreement.
   *
   * `quota_allocation_id` is NOT NULL on the service's side, so a line that did
   * not name an agreement could not be written at all — the save would fail on
   * a column the planner never sent.
   */
  it("sends one line per product, each carrying the agreement", async () => {
    getOne.mockResolvedValue(order());
    send.mockResolvedValue({});

    await distributionApiHttp.saveDraft(
      PLAN_ID,
      [
        {
          id: "row", outletId: OUTLET_A, outlet: "Pangkalan Ahmad", alamat: "—",
          lines: [
            { productId: "p1", jumlah: 30 },
            { productId: "p2", jumlah: 5 },
          ],
          jumlahUnit: 35, driverId: null, driver: "—", jamPengiriman: "—",
          tripNo: null, statusBayar: "Belum Lunas", sisaKuotaOutlet: 0,
          piutang: 0, piutangJatuhTempo: 0,
        },
      ],
      4,
    );

    const [, , body] = send.mock.calls[0];
    expect(body.version).toBe(4);
    expect(body.items).toHaveLength(2);
    expect(body.items.every((i: { agreement_id: string }) => i.agreement_id === SA_ID)).toBe(true);
  });

  /**
   * An empty line is dropped rather than sent as a zero.
   *
   * `planned_qty > 0` is a CHECK on the column, so a zero line is refused by the
   * database — and a stop the planner half-filled should not fail the whole
   * save.
   */
  it("drops lines with no product or no quantity", async () => {
    getOne.mockResolvedValue(order());
    send.mockResolvedValue({});

    await distributionApiHttp.saveDraft(
      PLAN_ID,
      [
        {
          id: "row", outletId: OUTLET_A, outlet: "Pangkalan Ahmad", alamat: "—",
          lines: [
            { productId: "p1", jumlah: 30 },
            { productId: "", jumlah: 5 },
            { productId: "p3", jumlah: 0 },
          ],
          jumlahUnit: 30, driverId: null, driver: "—", jamPengiriman: "—",
          tripNo: null, statusBayar: "Belum Lunas", sisaKuotaOutlet: 0,
          piutang: 0, piutangJatuhTempo: 0,
        },
      ],
      1,
    );

    const [, , body] = send.mock.calls[0];
    expect(body.items).toHaveLength(1);
  });

  /**
   * A plan with no agreement refuses to save rather than guessing one.
   *
   * This is the gap the module header names: the service has nowhere to record
   * the agreement until the plan has a stop, so a plan reopened after being
   * saved empty has lost it. Saying so beats picking an agreement on the
   * planner's behalf and spending quota they did not choose.
   */
  it("refuses to save when the plan names no agreement", async () => {
    getOne.mockResolvedValue(order({ items: [] }));

    await expect(distributionApiHttp.saveDraft(PLAN_ID, [], 1)).rejects.toThrow(
      /Schedule Agreement/,
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("sends the version on confirm and on cancel", async () => {
    send.mockResolvedValue(order({ order_status: "confirmed" }));
    await distributionApiHttp.confirmPlan(PLAN_ID, 7);
    expect(send.mock.calls[0][2]).toEqual({ version: 7 });

    send.mockResolvedValue({});
    await distributionApiHttp.cancelDistributionPlan(PLAN_ID, 8);
    expect(send.mock.calls[1][2]).toEqual({ version: 8 });
  });
});

describe("the suggestion", () => {
  /**
   * The service's proposal says the route was considered, and the mock's does
   * not. That single line is the one place the two builds are supposed to
   * differ, so it must not be copied from the packer.
   */
  it("reports the distance the service actually routed", async () => {
    send.mockResolvedValue({
      trips: [
        {
          trip_no: 1, driver_id: "d1", driver_code: "DRV-001", driver_name: "Slamet",
          vehicle_id: "v1", plate: "H 1234 AB",
          stops: [
            { sequence_no: 1, outlet_id: OUTLET_A, outlet_code: "PKL-001", outlet_name: "Ahmad", qty: 30, funded: true },
            { sequence_no: 2, outlet_id: OUTLET_B, outlet_code: "PKL-002", outlet_name: "Budi", qty: 20, funded: false },
          ],
          load_qty: 50, capacity_qty: 100, at_risk_qty: 20, distance_m: 12500,
        },
      ],
      unroutable: [
        { outlet_id: "z", outlet_code: "PKL-009", outlet_name: "Jauh", qty: 10, reason: "Di luar jangkauan" },
      ],
      summary: { distance_m: 12500, trips: 1, outlets: 2 },
    });

    const suggestion = await distributionApiHttp.suggestAssignment(PLAN_ID);

    expect(suggestion.trips[0].stops.map((s) => s.urutan)).toEqual([1, 2]);
    expect(suggestion.trips[0].muatanBerisiko).toBe(20);
    expect(suggestion.unroutable[0].alasan).toBe("Di luar jangkauan");
    expect(suggestion.dasar).toMatch(/12,5 km/);
  });
});
