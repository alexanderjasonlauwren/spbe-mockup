import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The HTTP adapter's mapping between the console's TransportationClaimEntity
 * and the backend's own transportationclaim.ClaimResponse, following
 * transactionApi.test.ts's own pattern.
 */

const getList = vi.fn();
const send = vi.fn();
vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  getOne: vi.fn(),
  send: (...args: unknown[]) => send(...args),
  upload: vi.fn(),
}));

const { transportationApiHttp } = await import("./transportationApi.http");

function claimWire(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    claim_number: "BAST-SLT-202609-0001",
    handover_reference: "BAST/2026/0001",
    handover_date: "2026-09-01",
    claimed_amount: 2_500_000,
    claim_status: "draft",
    version: 1,
    created_at: "2026-09-12T00:00:00+07:00",
    updated_at: "2026-09-12T00:00:00+07:00",
    ...overrides,
  };
}

beforeEach(() => {
  getList.mockReset();
  send.mockReset();
});

describe("getClaims", () => {
  it("maps the wire shape onto the console's own field names", async () => {
    getList.mockResolvedValue({
      items: [
        claimWire({
          principal_invoice_number: "INV/999/IV/2026",
          claim_status: "submitted",
          status_note: "Menunggu jawaban iVendor",
          status_updated_at: "2026-09-05T00:00:00+07:00",
          delivery_ids: ["22222222-2222-4222-8222-222222222222"],
        }),
      ],
    });

    const [claim] = await transportationApiHttp.getClaims();

    expect(claim.claimNumber).toBe("BAST-SLT-202609-0001");
    expect(claim.handoverReference).toBe("BAST/2026/0001");
    expect(claim.claimedAmount).toBe(2_500_000);
    expect(claim.claimStatus).toBe("submitted");
    expect(claim.principalInvoiceNumber).toBe("INV/999/IV/2026");
    expect(claim.statusNote).toBe("Menunggu jawaban iVendor");
    expect(claim.deliveryIds).toEqual(["22222222-2222-4222-8222-222222222222"]);
  });

  it("reads an absent invoice number and note as undefined, not fabricated", async () => {
    getList.mockResolvedValue({ items: [claimWire()] });
    const [claim] = await transportationApiHttp.getClaims();

    expect(claim.principalInvoiceNumber).toBeUndefined();
    expect(claim.statusNote).toBeUndefined();
    expect(claim.deliveryIds).toEqual([]);
  });

  it("sends a claim_status filter only when one is chosen", async () => {
    getList.mockResolvedValue({ items: [] });
    await transportationApiHttp.getClaims({ claimStatus: "approved" });

    const [, params] = getList.mock.calls[0];
    expect(params.filters).toEqual([
      { field: "claim_status", operator: "eq", value: "approved" },
    ]);
  });

  it("sends no filter for the 'Semua' option", async () => {
    getList.mockResolvedValue({ items: [] });
    await transportationApiHttp.getClaims({ claimStatus: "Semua" });

    const [, params] = getList.mock.calls[0];
    expect(params.filters).toEqual([]);
  });
});

describe("createClaim", () => {
  it("sends the wire field names, including optional delivery ids", async () => {
    send.mockResolvedValue(claimWire());
    await transportationApiHttp.createClaim({
      handoverReference: "BAST/2026/0001",
      handoverDate: "2026-09-01",
      claimedAmount: 2_500_000,
      deliveryIds: ["22222222-2222-4222-8222-222222222222"],
    });

    expect(send).toHaveBeenCalledWith("post", "/transportation-claims", {
      handover_reference: "BAST/2026/0001",
      handover_date: "2026-09-01",
      claimed_amount: 2_500_000,
      delivery_ids: ["22222222-2222-4222-8222-222222222222"],
    });
  });
});

describe("updateClaim", () => {
  it("sends only the fields provided, alongside the version", async () => {
    send.mockResolvedValue(claimWire());
    await transportationApiHttp.updateClaim({
      id: "11111111-1111-4111-8111-111111111111",
      version: 1,
      claimedAmount: 2_750_000,
    });

    expect(send).toHaveBeenCalledWith(
      "put",
      "/transportation-claims/11111111-1111-4111-8111-111111111111",
      { version: 1, claimed_amount: 2_750_000 },
    );
  });
});

describe("updateClaimStatus", () => {
  it("posts to the status sub-route with the new status and optional fields", async () => {
    send.mockResolvedValue(claimWire({ claim_status: "paid" }));
    const result = await transportationApiHttp.updateClaimStatus({
      id: "11111111-1111-4111-8111-111111111111",
      version: 2,
      claimStatus: "paid",
      principalInvoiceNumber: "INV/1/IV/2026",
      statusNote: "Dibayar penuh",
    });

    expect(send).toHaveBeenCalledWith(
      "post",
      "/transportation-claims/11111111-1111-4111-8111-111111111111/status",
      {
        version: 2,
        claim_status: "paid",
        principal_invoice_number: "INV/1/IV/2026",
        status_note: "Dibayar penuh",
      },
    );
    expect(result.claimStatus).toBe("paid");
  });
});

describe("deleteClaim", () => {
  it("sends a plain delete with no body", async () => {
    send.mockResolvedValue(undefined);
    await transportationApiHttp.deleteClaim("11111111-1111-4111-8111-111111111111");

    expect(send).toHaveBeenCalledWith(
      "delete",
      "/transportation-claims/11111111-1111-4111-8111-111111111111",
    );
  });
});
