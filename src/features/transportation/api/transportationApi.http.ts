/**
 * The BAST/transportation-fee ledger, against the real API.
 *
 * `GET /transportation-claims` is a new endpoint built alongside this
 * adapter (fortius-backend `internal/controller/transportationclaim`) --
 * D3's own A-Step 1, the flow document's own words: "the smallest useful
 * version is manual: record the BAST, record the invoice number, record
 * the status the agent read off iVendor."
 *
 * `claimStatus` bucket filtering happens client-side: the server's own
 * `claim_status` filter is `eq`-only and exact, which is already what the
 * console's dropdown needs (the six wire values and the console's own
 * ClaimStatus union are the same set, unlike delivery_status/payment_status
 * elsewhere in this codebase), so no translation is needed either way.
 */
import { getList, send } from "@/lib/api";
import type { ClaimStatus, ID } from "@/types/domain";
import type {
  ClaimFilters,
  ClaimView,
  CreateClaimInput,
  TransportationClaimApi,
  UpdateClaimInput,
  UpdateClaimStatusInput,
} from "./contract";

/** 100 is every list definition's MaxPageSize; the server refuses more. */
const PAGE_SIZE = 100;

/** Mirrors the backend's transportationclaim.ClaimResponse. */
interface ClaimResponse {
  id: string;
  claim_number: string;
  handover_reference: string;
  handover_date: string;
  claimed_amount: number;
  principal_invoice_number?: string;
  claim_status: ClaimStatus;
  status_note?: string;
  status_updated_at?: string;
  delivery_ids?: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

function toView(row: ClaimResponse): ClaimView {
  return {
    id: row.id,
    tenantId: "",
    branchId: "",
    claimNumber: row.claim_number,
    handoverReference: row.handover_reference,
    handoverDate: row.handover_date,
    claimedAmount: row.claimed_amount,
    principalInvoiceNumber: row.principal_invoice_number,
    claimStatus: row.claim_status,
    statusNote: row.status_note,
    statusUpdatedAt: row.status_updated_at,
    deliveryIds: row.delivery_ids ?? [],
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getClaims(filters?: ClaimFilters): Promise<ClaimView[]> {
  const page = await getList<ClaimResponse>("/transportation-claims", {
    pageSize: PAGE_SIZE,
    sort: [{ field: "handover_date", direction: "desc" }],
    search: filters?.search,
    filters:
      filters?.claimStatus && filters.claimStatus !== "Semua"
        ? [{ field: "claim_status", operator: "eq" as const, value: filters.claimStatus }]
        : [],
  });
  return page.items.map(toView);
}

async function createClaim(input: CreateClaimInput): Promise<ClaimView> {
  return toView(
    await send<ClaimResponse>("post", "/transportation-claims", {
      handover_reference: input.handoverReference,
      handover_date: input.handoverDate,
      claimed_amount: input.claimedAmount,
      delivery_ids: input.deliveryIds,
    }),
  );
}

async function updateClaim(input: UpdateClaimInput): Promise<ClaimView> {
  const body: Record<string, unknown> = { version: input.version };
  if (input.handoverReference !== undefined) body.handover_reference = input.handoverReference;
  if (input.handoverDate !== undefined) body.handover_date = input.handoverDate;
  if (input.claimedAmount !== undefined) body.claimed_amount = input.claimedAmount;
  return toView(await send<ClaimResponse>("put", `/transportation-claims/${input.id}`, body));
}

async function updateClaimStatus(input: UpdateClaimStatusInput): Promise<ClaimView> {
  return toView(
    await send<ClaimResponse>("post", `/transportation-claims/${input.id}/status`, {
      version: input.version,
      claim_status: input.claimStatus,
      principal_invoice_number: input.principalInvoiceNumber,
      status_note: input.statusNote,
    }),
  );
}

async function deleteClaim(id: ID): Promise<void> {
  await send("delete", `/transportation-claims/${id}`);
}

export const transportationApiHttp: TransportationClaimApi = {
  getClaims,
  createClaim,
  updateClaim,
  updateClaimStatus,
  deleteClaim,
};
