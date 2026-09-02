/**
 * The outlet adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { assertMockAllowed, pick } from "@/lib/dataSource";
import { getOutletHistory as getOutletHistoryMock, outletApiMock } from "./outletApi.mock";
import { outletApiHttp } from "./outletApi.http";
import type { OutletApi } from "./contract";

export type { OutletView } from "./contract";

const api: OutletApi = pick(outletApiMock, outletApiHttp);

export const getOutletList = api.getOutletList.bind(api);
export const getOutletDetail = api.getOutletDetail.bind(api);
export const createOrUpdateOutlet = api.createOrUpdateOutlet.bind(api);
export const removeOutlet = api.removeOutlet.bind(api);
export const getKecamatanOptions = api.getKecamatanOptions.bind(api);
export const exportOutlet = api.exportOutlet.bind(api);

/**
 * An outlet's recent surat jalan is mock-only, and says so.
 *
 * It reads `core.deliveries`, which the service does not expose — dispatch
 * writes those rows when a trip goes out and nothing serves them yet. Routing
 * it through `assertMockAllowed` means the detail page shows that sentence
 * where the history would be, rather than a list of invented deliveries beside
 * the outlet's real credit limit.
 */
export async function getOutletHistory(id: string, limit = 10) {
  assertMockAllowed("outlet.getOutletHistory");
  return getOutletHistoryMock(id, limit);
}
