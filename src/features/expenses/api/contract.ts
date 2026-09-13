export const EXPENSE_CATEGORIES = ["fuel", "toll", "maintenance", "petty_cash", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type ExpenseStatus = "pending" | "approved" | "rejected";
export type PaymentMode = "cash" | "bank";

export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  fuel: "Bahan bakar",
  toll: "Tol",
  maintenance: "Pemeliharaan",
  petty_cash: "Kas kecil",
  other: "Lainnya",
};

export const EXPENSE_STATUS_LABEL: Record<ExpenseStatus, string> = {
  pending: "Menunggu persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export interface ExpenseView {
  id: string;
  expenseNumber: string;
  category: ExpenseCategory;
  amount: number;
  paymentMode: PaymentMode;
  incurredBy: string;
  incurredAt: string;
  description?: string;
  ocrExtractionId?: string;
  approvalStatus: ExpenseStatus;
  approvedBy?: string;
  secondApprovedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilters {
  search?: string;
  category?: ExpenseCategory | "Semua";
  approvalStatus?: ExpenseStatus | "Semua";
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  paymentMode: PaymentMode;
  incurredAt: string;
  description?: string;
  incurredBy?: string;
  ocrExtractionId?: string;
}

export interface ExpenseDecisionInput {
  id: string;
  version: number;
  secondApproverId?: string;
  reason?: string;
}

export interface ExpenseApi {
  getExpenses(filters?: ExpenseFilters): Promise<ExpenseView[]>;
  createExpense(input: CreateExpenseInput): Promise<ExpenseView>;
  approveExpense(input: ExpenseDecisionInput): Promise<ExpenseView>;
  rejectExpense(input: ExpenseDecisionInput): Promise<ExpenseView>;
}
