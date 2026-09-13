import { beforeEach, describe, expect, it, vi } from "vitest";

const getList = vi.fn();
const send = vi.fn();
vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  send: (...args: unknown[]) => send(...args),
}));

const { ocrApiHttp } = await import("./ocrApi.http");

beforeEach(() => { getList.mockReset(); send.mockReset(); });

describe("ocrApiHttp", () => {
  it("joins archive state onto extractions without fabricating a status", async () => {
    getList
      .mockResolvedValueOnce({ items: [{ id: "ext-1", merchant_name: "SPBU", total_amount: 100000, created_at: "2026-09-13T01:00:00Z" }] })
      .mockResolvedValueOnce({ items: [{ id: "arc-1", extraction_id: "ext-1", category: "fuel", archived_at: "2026-09-13T02:00:00Z" }] });
    const [row] = await ocrApiHttp.getReceipts();
    expect(row.status).toBe("approved");
    expect(row.category).toBe("fuel");
  });

  it("creates an expense only when the reviewer requests one", async () => {
    send.mockResolvedValue({ extraction_id: "ext-1", archive_id: "arc-1", expense_id: "exp-1" });
    const result = await ocrApiHttp.verifyReceipt({ id: "ext-1", category: "fuel", createExpense: true, paymentMode: "bank", incurredAt: "2026-09-13" });
    expect(send).toHaveBeenCalledWith("post", "/ocr/extractions/ext-1/verify", {
      verification_status: "approved",
      category: "fuel",
      create_expense: { payment_mode: "bank", incurred_at: "2026-09-13" },
    });
    expect(result.expenseId).toBe("exp-1");
  });
});
