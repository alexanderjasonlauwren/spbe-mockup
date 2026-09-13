import { latency } from "@/mocks/db";
import { scopedDb } from "@/mocks/scope";
import {
  deleteTransportationClaim,
  saveTransportationClaim,
  updateTransportationClaimStatus,
} from "@/mocks/rules";
import type {
  ClaimFilters,
  ClaimView,
  CreateClaimInput,
  TransportationClaimApi,
  UpdateClaimInput,
  UpdateClaimStatusInput,
} from "./contract";
import type { ID } from "@/types/domain";

async function getClaims(filters?: ClaimFilters): Promise<ClaimView[]> {
  await latency("read");
  return scopedDb()
    .transportationClaims.filter((c) => {
      if (
        filters?.claimStatus &&
        filters.claimStatus !== "Semua" &&
        c.claimStatus !== filters.claimStatus
      ) {
        return false;
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          c.claimNumber.toLowerCase().includes(q) ||
          c.handoverReference.toLowerCase().includes(q) ||
          (c.principalInvoiceNumber ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.handoverDate.localeCompare(a.handoverDate));
}

async function createClaim(input: CreateClaimInput): Promise<ClaimView> {
  await latency("write");
  return saveTransportationClaim(input);
}

async function updateClaim(input: UpdateClaimInput): Promise<ClaimView> {
  await latency("write");
  return saveTransportationClaim(input);
}

async function updateClaimStatus(input: UpdateClaimStatusInput): Promise<ClaimView> {
  await latency("write");
  return updateTransportationClaimStatus(
    input.id,
    input.claimStatus,
    input.principalInvoiceNumber,
    input.statusNote,
  );
}

async function deleteClaim(id: ID): Promise<void> {
  await latency("write");
  deleteTransportationClaim(id);
}

export const transportationApiMock: TransportationClaimApi = {
  getClaims,
  createClaim,
  updateClaim,
  updateClaimStatus,
  deleteClaim,
};
