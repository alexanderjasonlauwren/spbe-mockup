import { getList, send } from "@/lib/api";
import type { ExpenseCategory } from "@/features/expenses/api/contract";
import type { CreateReceiptInput, OcrApi, ReceiptExtraction, VerifyReceiptInput, VerifyReceiptResult } from "./contract";

interface ExtractionResponse {
  id: string;
  merchant_name?: string;
  txn_date?: string;
  total_amount?: number;
  engine?: string;
  overall_confidence?: number;
  created_at: string;
}

interface ArchiveResponse {
  id: string;
  extraction_id: string;
  category: ExpenseCategory;
  archived_at: string;
}

interface VerificationResponse {
  extraction_id: string;
  archive_id?: string;
  expense_id?: string;
  expense_error?: string;
}

async function getReceipts(): Promise<ReceiptExtraction[]> {
  const [extractions, archive] = await Promise.all([
    getList<ExtractionResponse>("/ocr/extractions", { pageSize: 100, sort: [{ field: "created_at", direction: "desc" }] }),
    getList<ArchiveResponse>("/ocr/archive", { pageSize: 100, sort: [{ field: "archived_at", direction: "desc" }] }),
  ]);
  const archivedByExtraction = new Map(archive.items.map((row) => [row.extraction_id, row]));
  return extractions.items.map((row) => {
    const archived = archivedByExtraction.get(row.id);
    return {
      id: row.id,
      merchantName: row.merchant_name,
      txnDate: row.txn_date,
      totalAmount: row.total_amount,
      engine: row.engine,
      overallConfidence: row.overall_confidence,
      createdAt: row.created_at,
      status: archived ? "approved" : "pending",
      category: archived?.category,
    };
  });
}

async function createReceipt(input: CreateReceiptInput): Promise<ReceiptExtraction> {
  const row = await send<ExtractionResponse>("post", "/ocr/inbox", {
    file_name: input.fileName,
    source_channel: "upload",
    merchant_name: input.merchantName || undefined,
    txn_date: input.txnDate || undefined,
    total_amount: input.totalAmount || undefined,
  });
  return {
    id: row.id,
    fileName: input.fileName,
    merchantName: row.merchant_name,
    txnDate: row.txn_date,
    totalAmount: row.total_amount,
    engine: row.engine,
    overallConfidence: row.overall_confidence,
    createdAt: row.created_at,
    status: "pending",
  };
}

async function verifyReceipt(input: VerifyReceiptInput): Promise<VerifyReceiptResult> {
  const result = await send<VerificationResponse>("post", `/ocr/extractions/${input.id}/verify`, {
    verification_status: "approved",
    category: input.category,
    create_expense: input.createExpense ? {
      payment_mode: input.paymentMode,
      incurred_at: input.incurredAt,
      description: input.description || undefined,
    } : undefined,
  });
  return {
    extractionId: result.extraction_id,
    archiveId: result.archive_id,
    expenseId: result.expense_id,
    expenseError: result.expense_error,
  };
}

export const ocrApiHttp: OcrApi = { getReceipts, createReceipt, verifyReceipt };
