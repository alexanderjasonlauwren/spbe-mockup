/**
 * The transactions adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here
 * and a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { transactionApiMock } from "./transactionApi.mock";
import { transactionApiHttp } from "./transactionApi.http";
import type { TransactionsApi } from "./contract";

export { defaultRange } from "./contract";
export type {
  TransactionFilterOptions,
  TransactionFilters,
  TransactionRow,
  TransactionSummary,
} from "./contract";

const api: TransactionsApi = pick(transactionApiMock, transactionApiHttp);

export const getTransactions = api.getTransactions.bind(api);
export const getTransactionSummary = api.getTransactionSummary.bind(api);
export const getTransactionFilterOptions = api.getTransactionFilterOptions.bind(api);
export const exportTransactionsExcel = api.exportTransactionsExcel.bind(api);
export const exportTransactionsCsv = api.exportTransactionsCsv.bind(api);
