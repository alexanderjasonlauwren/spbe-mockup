import { latency } from "@/mocks/db";
import { scopedDb } from "@/mocks/scope";
import { createOutletWarning as createOutletWarningRule } from "@/mocks/rules";
import type {
  CreateOutletWarningInput,
  OutletWarningApi,
  OutletWarningView,
} from "./contract";
import type { ID } from "@/types/domain";

async function getOutletWarnings(outletId: ID): Promise<OutletWarningView[]> {
  await latency("read");
  return scopedDb()
    .outletWarnings.filter((w) => w.outletId === outletId)
    .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn));
}

async function createOutletWarning(input: CreateOutletWarningInput): Promise<OutletWarningView> {
  await latency("write");
  return createOutletWarningRule(input);
}

export const outletWarningApiMock: OutletWarningApi = {
  getOutletWarnings,
  createOutletWarning,
};
