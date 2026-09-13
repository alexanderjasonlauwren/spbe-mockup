import { beforeEach, describe, expect, it, vi } from "vitest";

const getList = vi.fn();
const send = vi.fn();
vi.mock("@/lib/api", () => ({
  getList: (...args: unknown[]) => getList(...args),
  send: (...args: unknown[]) => send(...args),
}));

const { expenseApiHttp } = await import("./expenseApi.http");

const wire = {
  id: "11111111-1111-4111-8111-111111111111",
  expense_number: "EXP-SLT-202609-0001",
  category: "fuel",
  amount: 125000,
  payment_mode: "cash",
  incurred_by: "Driver Satu",
  incurred_at: "2026-09-13",
  approval_status: "pending",
  version: 1,
  created_at: "2026-09-13T01:00:00Z",
  updated_at: "2026-09-13T01:00:00Z",
};

beforeEach(() => { getList.mockReset(); send.mockReset(); });

describe("expenseApiHttp", () => {
  it("maps expense wire fields and sends exact list filters", async () => {
    getList.mockResolvedValue({ items: [wire] });
    const [row] = await expenseApiHttp.getExpenses({ category: "fuel", approvalStatus: "pending" });
    expect(row.expenseNumber).toBe("EXP-SLT-202609-0001");
    expect(row.incurredBy).toBe("Driver Satu");
    expect(getList.mock.calls[0][1].filters).toEqual([
      { field: "category", operator: "eq", value: "fuel" },
      { field: "approval_status", operator: "eq", value: "pending" },
    ]);
  });

  it("sends the create and dual-control approval payloads", async () => {
    send.mockResolvedValue(wire);
    await expenseApiHttp.createExpense({ category: "fuel", amount: 125000, paymentMode: "cash", incurredAt: "2026-09-13" });
    expect(send).toHaveBeenCalledWith("post", "/expenses", expect.objectContaining({ category: "fuel", payment_mode: "cash" }));

    await expenseApiHttp.approveExpense({ id: wire.id, version: 1, secondApproverId: "22222222-2222-4222-8222-222222222222" });
    expect(send).toHaveBeenLastCalledWith("post", `/expenses/${wire.id}/approve`, {
      version: 1,
      second_approver_id: "22222222-2222-4222-8222-222222222222",
    });
  });
});
