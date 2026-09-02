/**
 * What every distribution planning adapter must provide.
 *
 * Same reason as `features/sa/api/contract.ts`: without a contract the mock and
 * the HTTP adapter drift, and the drift shows up only in whichever screen
 * happens to read the field one of them forgot.
 *
 * **Adapters return domain types.** The wire shape never escapes the HTTP
 * adapter — mapping there is what keeps every component unaware of which source
 * it is running against.
 */
import type {
  AssignmentSuggestion,
  DistributionPlan,
  DriverOption,
  PlanOption,
  PlanRow,
} from "../types";

/** What a stop can be loaded with. */
export interface ProductOption {
  id: string;
  label: string;
  satuan: string;
}

export interface DistributionApi {
  getPlanList(): Promise<DistributionPlan[]>;
  getPlan(planId: string): Promise<DistributionPlan>;
  getPlanDetail(planId: string): Promise<PlanRow[]>;

  /**
   * Opens a plan for a day.
   *
   * `saId` is the agreement its stops will draw on. The service records the
   * agreement per stop rather than per plan — one plan can legitimately spend a
   * base SA and a doping SA — so on the API build this choice is the default
   * applied to each stop as it is added, not a field stored on the plan. A plan
   * saved with no stops therefore does not remember it; see
   * `docs/technical-gaps.md`.
   */
  createPlan(input: { tanggal: string; saId: string }): Promise<DistributionPlan>;

  /**
   * Saves the plan's stops.
   *
   * `version` is the value the caller last read. The service refuses a save
   * built against a stale one with 409, rather than overwriting whatever
   * another planner committed in between — so the caller must pass what it
   * read, not what it wishes were true.
   */
  saveDraft(planId: string, rows: PlanRow[], version: number): Promise<void>;
  confirmPlan(planId: string, version: number): Promise<DistributionPlan>;
  cancelDistributionPlan(planId: string, version: number): Promise<void>;

  /* ── option lists for the planner ────────────────────────────────────── */
  getOutletOptions(): Promise<PlanOption[]>;
  getProductOptions(): Promise<ProductOption[]>;
  /** The line a brand-new stop starts with, so a row is never empty. */
  getDefaultProductId(): Promise<string>;
  getDriverOptions(planId: string): Promise<DriverOption[]>;
  getActiveSaOptions(): Promise<PlanOption[]>;

  /**
   * Proposes how to pack the plan's stops onto trips.
   *
   * Writes nothing: it is a proposal a planner accepts or ignores, which is why
   * the service guards it with a read permission rather than a write one.
   *
   * The two adapters differ here, and the `dasar` line is where they say so.
   * The browser packer has no outlet coordinates, so it can propose which stops
   * share a truck and never what order to drive them in; the service can do
   * both. Printing what the proposal rests on beats asserting a quality neither
   * adapter promised.
   */
  suggestAssignment(planId: string): Promise<AssignmentSuggestion>;
}
