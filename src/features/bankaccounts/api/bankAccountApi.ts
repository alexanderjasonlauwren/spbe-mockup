/**
 * The bank account adapter this build uses.
 *
 * Both implementations are passed to `pick`, so the choice is visible here and
 * a build cannot silently fall back to the mock.
 */
import { pick } from "@/lib/dataSource";
import { bankAccountApiMock } from "./bankAccountApi.mock";
import { bankAccountApiHttp } from "./bankAccountApi.http";
import type { BankAccountApi } from "./contract";

const api: BankAccountApi = pick(bankAccountApiMock, bankAccountApiHttp);

export const getBankAccounts = api.getBankAccounts.bind(api);
export const saveBankAccount = api.saveBankAccount.bind(api);
export const deleteBankAccount = api.deleteBankAccount.bind(api);
