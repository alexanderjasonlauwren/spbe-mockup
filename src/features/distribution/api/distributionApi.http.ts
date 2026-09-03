/**
 * Distribution planning, against the real API.
 *
 * This is also where the language boundary sits. The backend speaks English and
 * matches its own schema; the UI domain model is Indonesian (`kode`, `tanggal`,
 * `jumlahUnit`). Mapping here rather than renaming either side keeps the
 * backend consistent with its published contract and leaves every component
 * untouched — the direction technical-gaps 2.4 chose.
 *
 * # Where the two models genuinely differ
 *
 * **The agreement is per stop, not per plan.** `DistributionPlan.saId` is one
 * field; the service records `agreement_id` on each line, because one plan can
 * legitimately spend a base SA and a doping SA. So the plan's agreement is
 * *derived* here: it is the one every stop draws on, or blank when the plan is
 * empty or mixed. `createPlan`'s `saId` is therefore the default applied to
 * stops as they are added rather than a value the service stores — a plan saved
 * with no stops does not remember it.
 *
 * **A stop's decoration is not on the wire.** The planning screen shows an
 * address, the outlet's remaining monthly quota, and its receivable beside each
 * stop. None of those are on the order-item response: the address belongs to
 * the outlet module, the quota to outlet targets, the receivable to finance.
 * They arrive here as "unknown" rather than as zero, because a zero receivable
 * reads as "this outlet owes nothing" and that is a claim this adapter cannot
 * make. `docs/technical-gaps.md` records the three.
 *
 * **The crew comes from the dispatch board**, which is a second request. The
 * order's own lines carry only whether a stop is on a run and where in it —
 * `driver_id` moved to `core.dispatch_trips` because a driver is a property of
 * the run rather than of one line.
 */
import { getList, getOne, send } from "@/lib/api";
import type {
  AssignmentSuggestion,
  DistributionPlan,
  DriverOption,
  PlanOption,
  PlanRow,
  PlanStatus,
  SuggestedStop,
  SuggestedTrip,
  UnroutableStop,
} from "../types";
import type { DistributionApi, ProductOption } from "./contract";

/* ── wire shapes, mirroring the backend exactly ────────────────────────── */

interface OrderItemResponse {
  id: string;
  outlet_id?: string;
  outlet_code?: string;
  outlet_name?: string;
  product_id?: string;
  product_code?: string;
  product_name?: string;
  quota_allocation_id?: string;
  agreement_id?: string;
  agreement_number?: string;
  planned_qty: number;
  sequence_no?: number;
  assigned: boolean;
  payment_method: string;
  payment_state: string;
  item_status: string;
  notes?: string;
}

interface OrderResponse {
  id: string;
  order_number: string;
  branch_id?: string;
  order_date: string;
  planned_delivery_date: string;
  order_status: string;
  total_outlets: number;
  total_drivers: number;
  total_qty: number;
  notes?: string;
  agreement_id?: string;
  agreement_number?: string;
  agreement_remaining?: number;
  confirmed_by?: string;
  confirmed_at?: string;
  completed_at?: string;
  items?: OrderItemResponse[];
  version: number;
  created_at: string;
  updated_at: string;
}

interface TripResponse {
  trip_no: number;
  driver_id: string;
  driver_code: string;
  driver_name: string;
  vehicle_id: string;
  plate: string;
  stops: {
    sequence_no: number;
    outlet_id: string;
    outlet_code: string;
    outlet_name: string;
    qty: number;
    funded: boolean;
  }[];
  load_qty: number;
  capacity_qty: number;
  at_risk_qty: number;
  distance_m: number;
}

interface BoardResponse {
  trips: TripResponse[];
  unroutable: {
    outlet_id: string;
    outlet_code: string;
    outlet_name: string;
    qty: number;
    reason: string;
  }[];
  summary: { distance_m: number; trips: number; outlets: number };
}

interface OutletResponse {
  id: string;
  code: string;
  name: string;
  district?: string;
  city?: string;
  status: string;
}

interface ProductResponse {
  id: string;
  code: string;
  name: string;
  unit_abbreviation?: string;
  weight_kg: number;
  status: string;
}

interface AgreementListResponse {
  id: string;
  sa_number: string;
  supplier_name?: string;
  sa_status: string;
  period_end: string;
  total_quota_qty: number;
  allocated_quota_qty: number;
}

/**
 * How many rows an option list asks for.
 *
 * 100 because that is every list definition's `MaxPageSize`, and the server
 * refuses more with a 400 naming the field rather than quietly clamping — asked
 * for 200, every picker on the planning screen failed to load. It is also
 * enough: a picker longer than this needs a search box, not a bigger page, and
 * the day one does the fix is to type into it rather than to raise this.
 */
const OPTION_PAGE_SIZE = 100;

/* ── mapping ───────────────────────────────────────────────────────────── */

/**
 * The service's five states mapped onto the console's four words.
 *
 * `in_progress` shows as Terkonfirmasi rather than gaining a word of its own: to
 * a planner a plan whose trucks have left is still the confirmed plan, and the
 * screen that tracks the journey is Monitoring Distribusi.
 */
const STATUS_TO_DOMAIN: Record<string, PlanStatus> = {
  draft: "Draft",
  confirmed: "Terkonfirmasi",
  in_progress: "Terkonfirmasi",
  completed: "Selesai",
  cancelled: "Batal",
};

function toPlanStatus(wire: string): PlanStatus {
  return STATUS_TO_DOMAIN[wire] ?? "Draft";
}

/**
 * The agreement every stop draws on, or blank when they do not agree.
 *
 * Blank rather than the first one found: a plan spending two agreements has no
 * single answer, and picking one would put a number on screen that describes
 * only part of the plan.
 */
function derivedAgreement(items: OrderItemResponse[]): { id: string; number: string } {
  const live = items.filter((i) => i.item_status !== "cancelled");
  const ids = new Set(live.map((i) => i.agreement_id ?? ""));
  if (ids.size !== 1) return { id: "", number: live.length ? "Beberapa SA" : "—" };
  return { id: live[0].agreement_id ?? "", number: live[0].agreement_number ?? "—" };
}

function toPlanView(order: OrderResponse): DistributionPlan {
  // The order's own default first, the stops' agreement second.
  //
  // The default is what the planner chose when they opened the day, so it is
  // right even for a plan with no stops yet — which is the case the derivation
  // cannot answer at all. Where a plan has stops that disagree with it, the
  // stops are what the regulator traces, so they win the label.
  const derived = derivedAgreement(order.items ?? []);
  const agreement =
    derived.id !== "" ? derived : { id: order.agreement_id ?? "", number: order.agreement_number ?? derived.number };
  return {
    id: order.id,
    kode: order.order_number,
    tanggal: order.planned_delivery_date,
    totalUnit: order.total_qty,
    jumlahOutlet: order.total_outlets,
    jumlahDriver: order.total_drivers,
    status: toPlanStatus(order.order_status),
    saId: agreement.id,
    nomorSA: agreement.number,
    // What is left of the agreement, summed across its products, from the
    // order's own read. Zero when no agreement is set — the screen shows the
    // planner an agreement to choose rather than a quota to exceed.
    sisaKuotaSA: order.agreement_remaining ?? 0,
    catatan: order.notes,
    // The service records who confirmed a plan and not who drafted it: a draft
    // is attributed by created_by, which is not on the wire.
    dibuatOleh: "—",
    dikonfirmasiOleh: order.confirmed_by,
    dikonfirmasiPada: order.confirmed_at,
    version: order.version,
  };
}

/**
 * One PlanRow per outlet, whatever the stop is carrying.
 *
 * The service stores a line per (outlet, product) because that is what quota is
 * drawn against; the planning screen shows a stop per outlet with its mix
 * beneath. Grouping here is what lets one outlet take two cylinder sizes
 * without appearing twice on the route.
 */
function toPlanRows(items: OrderItemResponse[], board?: BoardResponse): PlanRow[] {
  const crewByOutlet = new Map<string, { driverId: string; driver: string; tripNo: number }>();
  for (const trip of board?.trips ?? []) {
    for (const stop of trip.stops) {
      crewByOutlet.set(stop.outlet_id, {
        driverId: trip.driver_id,
        driver: trip.driver_name,
        tripNo: trip.trip_no,
      });
    }
  }

  const byOutlet = new Map<string, PlanRow>();
  for (const item of items) {
    if (item.item_status === "cancelled") continue;
    const outletId = item.outlet_id ?? "";
    const crew = crewByOutlet.get(outletId);

    const row = byOutlet.get(outletId) ?? {
      // The first line's id addresses the stop. The screen edits stops, and a
      // stop that is several lines has no id of its own on the wire.
      id: item.id,
      outletId,
      outlet: item.outlet_name ?? "—",
      // Not on the order-item response; see the module header.
      alamat: "—",
      lines: [],
      jumlahUnit: 0,
      driverId: crew?.driverId ?? null,
      driver: crew?.driver ?? "Belum ditetapkan",
      // The service plans a delivery date, not a time of day. A clock here
      // would be a field only the demo fills.
      jamPengiriman: "—",
      tripNo: crew?.tripNo ?? item.sequence_no ?? null,
      statusBayar: item.payment_state === "paid" ? "Lunas" : "Belum Lunas",
      sisaKuotaOutlet: 0,
      piutang: 0,
      piutangJatuhTempo: 0,
    } satisfies PlanRow;

    row.lines.push({ productId: item.product_id ?? "", jumlah: item.planned_qty });
    row.jumlahUnit += item.planned_qty;
    // Any unpaid line makes the stop unpaid: the truck is loaded per stop, and
    // the half that is funded cannot be delivered on its own.
    if (item.payment_state !== "paid") row.statusBayar = "Belum Lunas";
    byOutlet.set(outletId, row);
  }

  return [...byOutlet.values()].sort((a, b) => a.outlet.localeCompare(b.outlet));
}

/* ── the adapter ───────────────────────────────────────────────────────── */

async function getPlanList(): Promise<DistributionPlan[]> {
  const page = await getList<OrderResponse>("/distribution/orders", {
    pageSize: OPTION_PAGE_SIZE,
    sort: [{ field: "planned_delivery_date", direction: "desc" }],
  });
  return page.items.map(toPlanView);
}

async function getPlan(planId: string): Promise<DistributionPlan> {
  return toPlanView(await getOne<OrderResponse>(`/distribution/orders/${planId}`));
}

async function getPlanDetail(planId: string): Promise<PlanRow[]> {
  const order = await getOne<OrderResponse>(`/distribution/orders/${planId}`);
  // The crew is a second request and a failure of it must not lose the stops:
  // a plan renders perfectly well with "Belum ditetapkan" beside each one, and
  // that is a better answer than an error page for a plan nobody has assigned.
  const board = await getBoard(planId);
  return toPlanRows(order.items ?? [], board);
}

async function getBoard(planId: string): Promise<BoardResponse | undefined> {
  try {
    return await getOne<BoardResponse>(`/distribution/orders/${planId}/trips`);
  } catch {
    return undefined;
  }
}

async function createPlan(input: { tanggal: string; saId: string }): Promise<DistributionPlan> {
  const created = await send<OrderResponse>("post", "/distribution/orders", {
    planned_delivery_date: input.tanggal,
    agreement_id: input.saId || undefined,
    items: [],
  });
  return toPlanView(created);
}

/**
 * Saves the plan's stops, flattening each one back into a line per product.
 *
 * `saId` travels per line because that is the service's model. The rows the
 * screen holds carry the plan's agreement, so it is read from the plan rather
 * than from the row — the day the screen lets a planner pick an agreement per
 * stop, this is the line that changes and nothing else.
 */
async function saveDraft(planId: string, rows: PlanRow[], version: number): Promise<void> {
  const plan = await getPlan(planId);
  const agreementId = plan.saId;
  if (!agreementId) {
    throw new Error(
      "Rencana ini belum terikat ke Schedule Agreement. Buka kembali rencana dan pilih SA " +
        "sebelum menambahkan titik singgah.",
    );
  }

  const items = rows.flatMap((row) =>
    row.lines
      .filter((line) => line.productId && line.jumlah > 0)
      .map((line) => ({
        outlet_id: row.outletId,
        product_id: line.productId,
        agreement_id: agreementId,
        planned_qty: line.jumlah,
      })),
  );

  await send("put", `/distribution/orders/${planId}`, { version, items });
}

async function confirmPlan(planId: string, version: number): Promise<DistributionPlan> {
  return toPlanView(
    await send<OrderResponse>("post", `/distribution/orders/${planId}/confirm`, { version }),
  );
}

async function cancelDistributionPlan(planId: string, version: number): Promise<void> {
  await send("post", `/distribution/orders/${planId}/cancel`, { version });
}

/* ── option lists for the planner ──────────────────────────────────────── */

async function getOutletOptions(): Promise<PlanOption[]> {
  const page = await getList<OutletResponse>("/outlets", {
    pageSize: OPTION_PAGE_SIZE,
    sort: [{ field: "name" }],
    filters: [{ field: "status", operator: "eq", value: "atv" }],
  });
  return page.items.map((o) => ({
    id: o.id,
    label: o.name,
    sublabel: [o.district && `Kec. ${o.district}`, o.city].filter(Boolean).join(" · ") || o.code,
  }));
}

async function getProductOptions(): Promise<ProductOption[]> {
  const page = await getList<ProductResponse>("/products", {
    pageSize: OPTION_PAGE_SIZE,
    sort: [{ field: "name" }],
    filters: [{ field: "status", operator: "eq", value: "atv" }],
  });
  return page.items.map((p) => ({
    id: p.id,
    label: p.name,
    // The counting noun, from core.units. A product with no unit recorded is
    // shown without one rather than being called a tabung it may not be.
    satuan: p.unit_abbreviation ?? "",
  }));
}

async function getDefaultProductId(): Promise<string> {
  const options = await getProductOptions();
  return options[0]?.id ?? "";
}

/**
 * Drivers with the load already on them, from the plan's own board.
 *
 * Capacity comes from the vehicle the driver is crewed with on this plan, which
 * is why it is read from the board rather than from the driver: a driver has no
 * capacity, a truck does, and the pairing belongs to the run. A driver not yet
 * on any trip is offered with no capacity — the planner can still assign them,
 * and the service settles the vehicle when the assignment is applied.
 */
async function getDriverOptions(planId: string): Promise<DriverOption[]> {
  const [page, board, fleet] = await Promise.all([
    getList<{ id: string; code: string; full_name: string; status: string }>("/drivers", {
      pageSize: OPTION_PAGE_SIZE,
      sort: [{ field: "full_name" }],
      filters: [{ field: "status", operator: "eq", value: "atv" }],
    }),
    getBoard(planId),
    getList<{ capacity_qty: number; operational_status: string }>("/vehicles", {
      pageSize: OPTION_PAGE_SIZE,
      filters: [{ field: "status", operator: "eq", value: "atv" }],
    }),
  ]);

  // The ceiling for a driver nobody has crewed yet.
  //
  // Capacity belongs to the truck, and which truck this driver gets is decided
  // when the run is built — so before that the honest ceiling is the largest
  // one the depot could give them. Zero was the alternative and it was worse
  // than wrong: the planning screen read it as "this driver can carry nothing",
  // reported every stop as an overload, and refused to let the plan be
  // confirmed at all.
  const largest = Math.max(
    0,
    ...fleet.items
      .filter((v) => v.operational_status !== "maintenance")
      .map((v) => v.capacity_qty),
  );

  const crewed = new Map(
    (board?.trips ?? []).map((t) => [
      t.driver_id,
      { plate: t.plate, load: t.load_qty, capacity: t.capacity_qty },
    ]),
  );

  return page.items.map((d) => {
    const trip = crewed.get(d.id);
    return {
      id: d.id,
      label: d.full_name,
      sublabel: trip ? `${trip.plate} · ${d.code}` : d.code,
      kapasitas: trip?.capacity ?? largest,
      muatan: trip?.load ?? 0,
      status: d.status === "atv" ? "Aktif" : d.status,
      disabled: false,
    };
  });
}

async function getActiveSaOptions(): Promise<PlanOption[]> {
  const page = await getList<AgreementListResponse>("/schedule-agreements", {
    pageSize: OPTION_PAGE_SIZE,
    sort: [{ field: "period_end", direction: "desc" }],
    filters: [{ field: "sa_status", operator: "eq", value: "active" }],
  });
  return page.items.map((sa) => {
    const sisa = sa.total_quota_qty - sa.allocated_quota_qty;
    return {
      id: sa.id,
      label: sa.sa_number,
      sublabel: `${sa.supplier_name ?? "—"} · sisa ${sisa.toLocaleString("id-ID")}`,
      disabled: sisa <= 0,
    };
  });
}

/**
 * The service's proposal, which orders the stops as well as packing them.
 *
 * `dasar` says so, and it is the one line the two adapters are meant to differ
 * on: the browser packer has no coordinates and says it groups by capacity
 * alone, while this one can honestly claim the route was considered.
 */
async function suggestAssignment(planId: string): Promise<AssignmentSuggestion> {
  const board = await send<BoardResponse>(
    "post",
    `/distribution/orders/${planId}/suggest-assignment`,
  );

  const trips: SuggestedTrip[] = board.trips.map((trip) => ({
    tripNo: trip.trip_no,
    driverId: trip.driver_id,
    driver: trip.driver_name,
    armada: trip.plate,
    kapasitas: trip.capacity_qty,
    muatan: trip.load_qty,
    muatanBerisiko: trip.at_risk_qty,
    stops: trip.stops.map(
      (stop): SuggestedStop => ({
        outletId: stop.outlet_id,
        outlet: stop.outlet_name,
        jumlahUnit: stop.qty,
        urutan: stop.sequence_no,
        lunas: stop.funded,
      }),
    ),
  }));

  const unroutable: UnroutableStop[] = board.unroutable.map((stop) => ({
    outletId: stop.outlet_id,
    outlet: stop.outlet_name,
    jumlahUnit: stop.qty,
    alasan: stop.reason,
  }));

  const km = (board.summary.distance_m / 1000).toLocaleString("id-ID", {
    maximumFractionDigits: 1,
  });
  return {
    trips,
    unroutable,
    dasar:
      `Dikelompokkan per kapasitas armada dan diurutkan menurut jarak antar ` +
      `${"titik singgah"} — total ± ${km} km untuk ${board.summary.trips} trip.`,
  };
}

export const distributionApiHttp: DistributionApi = {
  getPlanList,
  getPlan,
  getPlanDetail,
  createPlan,
  saveDraft,
  confirmPlan,
  cancelDistributionPlan,
  getOutletOptions,
  getProductOptions,
  getDefaultProductId,
  getDriverOptions,
  getActiveSaOptions,
  suggestAssignment,
};
