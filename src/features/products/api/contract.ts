/**
 * What every product adapter must provide.
 *
 * Same reason as every other feature's contract: without one the mock and the
 * HTTP adapter drift, and the drift shows up only in whichever screen reads
 * the field one of them forgot.
 *
 * # Why `stokTersedia` exists
 *
 * `internal/controller/product` is real and mounted, but it is a catalogue
 * module, not a stock module: `core.products` has no quantity column, cost
 * price is a separate tiered-pricing resource with no write route at all
 * ("pricing has effective dates and an approval path of its own" — the
 * response DTO's own comment), and stock lives in `core.stock_levels`, which
 * nothing serves yet. Reporting a live count, a cost-based stock value, or a
 * low-stock flag against an API this build cannot ask would be a confident
 * zero standing in for "unknown" — the same lie `OutletView.statistikTersedia`
 * exists to avoid, and the same fix: a flag the screen checks to hide the
 * panel that cannot be filled, rather than a row of numbers that look like
 * data.
 */
import type { ProductEntity } from "@/types/domain";

export interface ProductView extends ProductEntity {
  /** Selling price minus cost, per unit. */
  margin: number;
  marginPersen: number;
  stokRendah: boolean;
  nilaiStok: number;
  /**
   * Whether `stok`, `stokMinimum`'s comparison, `nilaiStok` and `stokRendah`
   * mean anything in this build. False on the API build — see this file's
   * own header.
   */
  stokTersedia: boolean;
}

export interface ProductFilters {
  search?: string;
  onlyLowStock?: boolean;
  onlyActive?: boolean;
}

export interface StockSummary {
  total: number;
  aktif: number;
  stokRendah: number;
  nilaiStok: number;
  /** See `ProductView.stokTersedia` — false on the API build. */
  stokTersedia: boolean;
}

export interface ProductApi {
  getProducts(filters?: ProductFilters): Promise<ProductView[]>;
  getProductDetail(id: string): Promise<ProductView>;
  createOrUpdateProduct(
    input: Partial<ProductEntity> & { id?: string },
  ): Promise<ProductView>;
  removeProduct(id: string): Promise<void>;
  /** Mock-only in this build — see `productApi.http.ts`'s own note. */
  changeStock(id: string, delta: number, alasan: string): Promise<ProductView>;
  getStockSummary(): Promise<StockSummary>;
  exportProducts(): Promise<number>;
}
