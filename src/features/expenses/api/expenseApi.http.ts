import { getList, send } from "@/lib/api";
import type {
  CreateExpenseInput,
  ExpenseApi,
  ExpenseDecisionInput,
  ExpenseFilters,
  ExpenseView,
} from "./contract";

interface ExpenseResponse {
  id: string;
  expense_number: string;
  category: ExpenseView["category"];
  amount: number;
  payment_mode: ExpenseView["paymentMode"];
  incurred_by: string;
  incurred_at: string;
  description?: string;
  ocr_extraction_id?: string;
  approval_status: ExpenseView["approvalStatus"];
  approved_by?: string;
  second_approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

function toView(row: ExpenseResponse): ExpenseView {
  return {
    id: row.id,
    expenseNumber: row.expense_number,
    category: row.category,
    amount: row.amount,
    paymentMode: row.payment_mode,
    incurredBy: row.incurred_by,
    incurredAt: row.incurred_at,
    description: row.description,
    ocrExtractionId: row.ocr_extraction_id,
    approvalStatus: row.approval_status,
    approvedBy: row.approved_by,
    secondApprovedBy: row.second_approved_by,
    approvedAt: row.approved_at,
    rejectionReason: row.rejection_reason,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getExpenses(filters?: ExpenseFilters): Promise<ExpenseView[]> {
  const list = await getList<ExpenseResponse>("/expenses", {
    pageSize: 100,
    search: filters?.search,
    sort: [{ field: "incurred_at", direction: "desc" }],
    filters: [
      ...(filters?.category && filters.category !== "Semua"
        ? [{ field: "category", operator: "eq" as const, value: filters.category }]
        : []),
      ...(filters?.approvalStatus && filters.approvalStatus !== "Semua"
        ? [{ field: "approval_status", operator: "eq" as const, value: filters.approvalStatus }]
        : []),
    ],
  });
  return list.items.map(toView);
}

async function createExpense(input: CreateExpenseInput): Promise<ExpenseView> {
  return toView(await send<ExpenseResponse>("post", "/expenses", {
    category: input.category,
    amount: input.amount,
    payment_mode: input.paymentMode,
    incurred_at: input.incurredAt,
    description: input.description || undefined,
    incurred_by: input.incurredBy,
    ocr_extraction_id: input.ocrExtractionId,
  }));
}

async function approveExpense(input: ExpenseDecisionInput): Promise<ExpenseView> {
  return toView(await send<ExpenseResponse>("post", `/expenses/${input.id}/approve`, {
    version: input.version,
    second_approver_id: input.secondApproverId,
  }));
}

async function rejectExpense(input: ExpenseDecisionInput): Promise<ExpenseView> {
  return toView(await send<ExpenseResponse>("post", `/expenses/${input.id}/reject`, {
    version: input.version,
    reason: input.reason,
  }));
}

export const expenseApiHttp: ExpenseApi = {
  getExpenses,
  createExpense,
  approveExpense,
  rejectExpense,
};
