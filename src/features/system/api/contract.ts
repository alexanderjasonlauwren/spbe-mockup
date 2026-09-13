/**
 * What every system-screen adapter must provide.
 *
 * Two unrelated concerns share this file because the console presents them
 * on one screen, matching `systemApi.ts`'s own pre-split shape: supplier
 * mastery (per this plan's own decision 5, not a real `core.suppliers`
 * table -- see `systemApi.http.ts`'s own header) and the numbering/
 * operations settings this tenant runs under.
 */
import type { NumberingEntity, OperationsEntity, SupplierEntity } from "@/mocks/types";

export interface SupplierView extends SupplierEntity {
  /** Agreements issued by this supplier, so it is clear what deleting would orphan. */
  jumlahSA: number;
  kuotaAktif: number;
}

export interface SystemApi {
  getSupplierList(): Promise<SupplierView[]>;
  saveSupplier(input: Partial<SupplierEntity> & { id?: string }): Promise<SupplierEntity>;
  deleteSupplier(id: string): Promise<void>;
  getSystemConfig(): Promise<{ penomoran: NumberingEntity; operasi: OperationsEntity }>;
  saveNumbering(penomoran: NumberingEntity): Promise<NumberingEntity>;
  saveOperations(operasi: OperationsEntity): Promise<OperationsEntity>;
}
