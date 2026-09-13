/**
 * What every schedule agreement adapter must provide.
 *
 * Same reason as `features/users/api/contract.ts`: without a contract the mock
 * and the HTTP adapter drift, and the drift shows up only in whichever screen
 * happens to read the field one of them forgot.
 *
 * **Adapters return domain types.** The wire shape never escapes the HTTP
 * adapter — mapping there is what keeps every component unaware of which source
 * it is running against.
 */
import type {
  SAImportApplied,
  SAImportBatch,
  ScheduleAgreement,
  SAFilterParams,
  UploadSAPayload,
} from "../types";

export interface ScheduleAgreementApi {
  getSAList(filters?: SAFilterParams): Promise<ScheduleAgreement[]>;
  getSADetail(id: string): Promise<ScheduleAgreement>;
  uploadSA(payload: UploadSAPayload): Promise<ScheduleAgreement>;
  activateSA(id: string): Promise<ScheduleAgreement>;
  deleteSA(id: string): Promise<void>;
  /**
   * Suppliers the tenant has recorded agreements with, for the upload form's
   * datalist. Derived from existing agreements rather than a master list: the
   * backend has no supplier table, and inventing one to populate a dropdown
   * would be a table nobody maintains.
   */
  getSupplierOptions(): Promise<string[]>;

  /**
   * Reads a Base SA export and reports what applying it would do. Writes
   * nothing.
   *
   * Two calls rather than one because approving the diff is the point: a
   * `POST` that parsed and wrote in a single step would make a mistyped column
   * a month of overwritten obligations instead of a glance at a table.
   */
  parseImport(saId: string, file: File): Promise<SAImportBatch>;
  /** Writes the targets a reviewed batch describes. */
  applyImport(batchId: string): Promise<SAImportApplied>;
}
