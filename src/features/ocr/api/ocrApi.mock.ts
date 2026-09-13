import { latency, nextId } from "@/mocks/db";
import { getActiveScope } from "@/mocks/scope";
import { expenseApiMock } from "@/features/expenses/api/expenseApi.mock";
import type { CreateReceiptInput, OcrApi, ReceiptExtraction, VerifyReceiptInput, VerifyReceiptResult } from "./contract";

type ScopedReceipt = ReceiptExtraction & { tenantId: string; branchId: string };
const rows: ScopedReceipt[] = [];

async function getReceipts(): Promise<ReceiptExtraction[]> {
  await latency("read");
  const scope = getActiveScope();
  return rows.filter((row) => scope.visibleTenantIds.includes(row.tenantId) && (!scope.branchId || row.branchId === scope.branchId));
}

async function createReceipt(input: CreateReceiptInput): Promise<ReceiptExtraction> {
  await latency("upload");
  const scope = getActiveScope();
  const row: ScopedReceipt = {
    id: nextId("ocr"),
    fileName: input.fileName,
    merchantName: input.merchantName,
    txnDate: input.txnDate,
    totalAmount: input.totalAmount,
    engine: "manual",
    overallConfidence: 1,
    createdAt: new Date().toISOString(),
    status: "pending",
    tenantId: scope.actingTenantId,
    branchId: scope.branchId ?? "",
  };
  rows.unshift(row);
  return row;
}

async function verifyReceipt(input: VerifyReceiptInput): Promise<VerifyReceiptResult> {
  await latency("write");
  const row = rows.find((item) => item.id === input.id);
  if (!row || row.status !== "pending") throw new Error("Bukti biaya sudah diproses atau tidak ditemukan.");
  row.status = "approved";
  row.category = input.category;
  let expenseId: string | undefined;
  let expenseError: string | undefined;
  if (input.createExpense) {
    if (!row.totalAmount || row.totalAmount <= 0) {
      expenseError = "Bukti tidak memiliki nilai yang dapat dibuat menjadi pengeluaran.";
    } else {
      const expense = await expenseApiMock.createExpense({
        category: input.category,
        amount: row.totalAmount,
        paymentMode: input.paymentMode,
        incurredAt: input.incurredAt,
        description: input.description,
        ocrExtractionId: row.id,
      });
      expenseId = expense.id;
    }
  }
  return { extractionId: row.id, archiveId: nextId("arc"), expenseId, expenseError };
}

export const ocrApiMock: OcrApi = { getReceipts, createReceipt, verifyReceipt };
