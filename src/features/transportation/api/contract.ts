/**
 * What every transportation-claim adapter must provide.
 *
 * D3's own A-Step 1: the smallest useful version of tracking a BAST --
 * record the handover, record the claimed amount, record what iVendor
 * answered. The schema and this contract both call it a "transportation
 * claim" and a "handover reference"; every screen reading this type says
 * "BAST" -- see the plan's own decision 7 for why the words split there.
 */
import type { ClaimStatus, ID, TransportationClaimEntity } from "@/types/domain";

export type ClaimView = TransportationClaimEntity;

/** Indonesian display labels -- the wire/store value stays the CHECK constraint's own English word. */
export const CLAIM_STATUS_LABEL: Record<ClaimStatus, string> = {
  draft: "Draft",
  submitted: "Diserahkan",
  under_review: "Sedang Ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Lunas",
};

export const CLAIM_STATUSES: ClaimStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "paid",
];

export interface ClaimFilters {
  search?: string;
  claimStatus?: ClaimStatus | "Semua";
}

export interface CreateClaimInput {
  handoverReference: string;
  handoverDate: string;
  claimedAmount: number;
  /** Optional -- see this contract's own header on why a claim may carry none. */
  deliveryIds?: ID[];
}

export interface UpdateClaimInput {
  id: ID;
  version: number;
  handoverReference?: string;
  handoverDate?: string;
  claimedAmount?: number;
}

export interface UpdateClaimStatusInput {
  id: ID;
  version: number;
  claimStatus: ClaimStatus;
  principalInvoiceNumber?: string;
  statusNote?: string;
}

export interface TransportationClaimApi {
  getClaims(filters?: ClaimFilters): Promise<ClaimView[]>;
  createClaim(input: CreateClaimInput): Promise<ClaimView>;
  updateClaim(input: UpdateClaimInput): Promise<ClaimView>;
  updateClaimStatus(input: UpdateClaimStatusInput): Promise<ClaimView>;
  deleteClaim(id: ID): Promise<void>;
}
