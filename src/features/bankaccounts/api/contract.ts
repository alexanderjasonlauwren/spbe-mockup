/**
 * What every bank account adapter must provide.
 *
 * Split out of `system/api` because the backend models it as its own
 * resource (`internal/controller/bankaccount`, tenant-wide, not
 * branch-scoped) with nothing else sharing the file — same reasoning as
 * every other feature's contract.
 */
import type { BankAccountEntity } from "@/types/domain";

export interface BankAccountApi {
  getBankAccounts(): Promise<BankAccountEntity[]>;
  saveBankAccount(
    input: Partial<BankAccountEntity> & { id?: string },
  ): Promise<BankAccountEntity>;
  deleteBankAccount(id: string): Promise<void>;
}
