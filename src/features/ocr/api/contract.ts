import type { ExpenseCategory, PaymentMode } from "@/features/expenses/api/contract";

export interface ReceiptExtraction {
  id: string;
  fileName?: string;
  merchantName?: string;
  txnDate?: string;
  totalAmount?: number;
  engine?: string;
  overallConfidence?: number;
  createdAt: string;
  status: "pending" | "approved";
  category?: ExpenseCategory;
}

export interface CreateReceiptInput {
  fileName: string;
  merchantName?: string;
  txnDate?: string;
  totalAmount?: number;
}

export interface VerifyReceiptInput {
  id: string;
  category: ExpenseCategory;
  createExpense: boolean;
  paymentMode: PaymentMode;
  incurredAt: string;
  description?: string;
}

export interface VerifyReceiptResult {
  extractionId: string;
  archiveId?: string;
  expenseId?: string;
  expenseError?: string;
}

export interface OcrApi {
  getReceipts(): Promise<ReceiptExtraction[]>;
  createReceipt(input: CreateReceiptInput): Promise<ReceiptExtraction>;
  verifyReceipt(input: VerifyReceiptInput): Promise<VerifyReceiptResult>;
}
