import { currentActor, latency, nextId } from "@/mocks/db";
import { getActiveScope } from "@/mocks/scope";
import type {
  CreateExpenseInput,
  ExpenseApi,
  ExpenseDecisionInput,
  ExpenseFilters,
  ExpenseView,
} from "./contract";

type ScopedExpense = ExpenseView & { tenantId: string; branchId: string };
const rows: ScopedExpense[] = [];

function visibleRows(): ScopedExpense[] {
  const scope = getActiveScope();
  return rows.filter((row) =>
    scope.visibleTenantIds.includes(row.tenantId) &&
    (!scope.branchId || row.branchId === scope.branchId) &&
    (scope.allowedBranchIds.length === 0 || scope.allowedBranchIds.includes(row.branchId))
  );
}

async function getExpenses(filters?: ExpenseFilters): Promise<ExpenseView[]> {
  await latency("read");
  const search = filters?.search?.trim().toLowerCase();
  return visibleRows()
    .filter((row) => !search || row.expenseNumber.toLowerCase().includes(search) || row.description?.toLowerCase().includes(search))
    .filter((row) => !filters?.category || filters.category === "Semua" || row.category === filters.category)
    .filter((row) => !filters?.approvalStatus || filters.approvalStatus === "Semua" || row.approvalStatus === filters.approvalStatus)
    .sort((a, b) => b.incurredAt.localeCompare(a.incurredAt));
}

async function createExpense(input: CreateExpenseInput): Promise<ExpenseView> {
  await latency("write");
  const scope = getActiveScope();
  const now = new Date().toISOString();
  const row: ScopedExpense = {
    id: nextId("exp"),
    expenseNumber: `EXP-${now.slice(0, 7).replace("-", "")}-${String(rows.length + 1).padStart(4, "0")}`,
    category: input.category,
    amount: input.amount,
    paymentMode: input.paymentMode,
    incurredBy: currentActor(),
    incurredAt: input.incurredAt,
    description: input.description,
    ocrExtractionId: input.ocrExtractionId,
    approvalStatus: "pending",
    version: 1,
    createdAt: now,
    updatedAt: now,
    tenantId: scope.actingTenantId,
    branchId: scope.branchId ?? "",
  };
  rows.unshift(row);
  return row;
}

async function approveExpense(input: ExpenseDecisionInput): Promise<ExpenseView> {
  await latency("write");
  const row = rows.find((item) => item.id === input.id && item.version === input.version);
  if (!row || row.approvalStatus !== "pending") throw new Error("Pengeluaran sudah berubah. Muat ulang lalu coba lagi.");
  row.approvalStatus = "approved";
  row.approvedBy = currentActor();
  row.secondApprovedBy = input.secondApproverId ? "Penyetuju kedua" : undefined;
  row.approvedAt = new Date().toISOString();
  row.updatedAt = row.approvedAt;
  row.version += 1;
  return row;
}

async function rejectExpense(input: ExpenseDecisionInput): Promise<ExpenseView> {
  await latency("write");
  const row = rows.find((item) => item.id === input.id && item.version === input.version);
  if (!row || row.approvalStatus !== "pending") throw new Error("Pengeluaran sudah berubah. Muat ulang lalu coba lagi.");
  row.approvalStatus = "rejected";
  row.approvedBy = currentActor();
  row.approvedAt = new Date().toISOString();
  row.rejectionReason = input.reason;
  row.updatedAt = row.approvedAt;
  row.version += 1;
  return row;
}

export const expenseApiMock: ExpenseApi = { getExpenses, createExpense, approveExpense, rejectExpense };
