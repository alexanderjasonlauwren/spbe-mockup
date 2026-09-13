/**
 * The catalogue, against the real API.
 *
 * `internal/controller/product` is real and mounted, but see this feature's
 * own contract.ts for why it only covers half the console's mock model:
 * cost price and stock quantity have no write route at all in this build
 * (pricing is a separate, read-only, tiered resource; stock lives in
 * `core.stock_levels`, which nothing serves yet). `stokTersedia: false` on
 * every row this adapter returns is how the console screens know to hide
 * the panels that depend on either.
 *
 * # The category this build always picks
 *
 * `CreateProductRequest.category` is required server-side, but the
 * console's `ProductEntity` has no category field at all — the form was
 * built before the backend's category-per-business-type model existed.
 * Rather than block every create until the form grows a picker, this
 * adapter fetches the tenant's own categories on every create and always uses the
 * first one returned. This is a real, temporary limitation, not a design
 * decision: every product this build creates lands in one category until
 * the form is extended to choose.
 */
import { getList, getOne, send } from "@/lib/api";
import { exportCsv, timestampSuffix } from "@/lib/export";
import type { ProductEntity } from "@/types/domain";
import type { ProductApi, ProductFilters, ProductView, StockSummary } from "./contract";

const PAGE_SIZE = 100;

/** Mirrors the backend's ProductResponse. */
interface ProductResponse {
  id: string;
  code: string;
  name: string;
  category: string;
  category_name: string;
  description?: string;
  brand?: string;
  weight_kg: number;
  unit_id?: string;
  unit_name?: string;
  unit_abbreviation?: string;
  barcode?: string;
  min_stock: number;
  current_sell_price?: number;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface CategoryResponse {
  code: string;
  name: string;
  sort_order: number;
}

async function resolveDefaultCategory(): Promise<string> {
  const categories = await getOne<CategoryResponse[]>("/products/categories");
  const first = categories[0];
  if (!first) {
    throw new Error(
      "Tenant ini belum memiliki kategori produk terdaftar, jadi produk baru tidak dapat dibuat.",
    );
  }
  return first.code;
}

/**
 * `ukuran` is a free-text display label in the mock ("3kg", "5.5kg") with no
 * equivalent column server-side — the closest real field is `weight_kg`, the
 * weight of one unit, which is what "ukuran" means for a cylinder catalogue
 * in practice. Read back formatted as "<n> kg"; written back by taking the
 * leading number out of whatever the form holds, so a size typed as "12" or
 * "12kg" both round-trip, but a non-numeric label (a future non-cylinder
 * product) is refused rather than silently turned into 0kg.
 */
function toUkuran(weightKg: number): string {
  return `${weightKg} kg`;
}

function parseWeightKg(ukuran: string): number {
  const match = ukuran.match(/[\d.]+/);
  const value = match ? Number(match[0]) : NaN;
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      `"${ukuran}" tidak mengandung angka berat yang valid (contoh: "12 kg"). ` +
        "Bangun ini menyimpan ukuran sebagai berat produk di build API.",
    );
  }
  return value;
}

function toView(row: ProductResponse): ProductView {
  const hargaJual = row.current_sell_price ?? 0;
  return {
    id: row.id,
    kode: row.code,
    nama: row.name,
    ukuran: toUkuran(row.weight_kg),
    satuan: row.unit_abbreviation ?? row.unit_name ?? "—",
    // Not modeled server-side; nothing reads this in the console today.
    returnable: false,
    hargaJual,
    // No cost-price read in this response — see this file's header.
    hargaBeli: 0,
    stok: 0,
    stokMinimum: row.min_stock,
    aktif: row.status === "atv",
    margin: 0,
    marginPersen: 0,
    stokRendah: false,
    nilaiStok: 0,
    stokTersedia: false,
  };
}

async function getProducts(filters?: ProductFilters): Promise<ProductView[]> {
  const page = await getList<ProductResponse>("/products", {
    pageSize: PAGE_SIZE,
    sort: [{ field: "name" }],
    search: filters?.search,
    filters:
      filters?.onlyActive === false
        ? []
        : filters?.onlyActive
          ? [{ field: "status", operator: "eq" as const, value: "atv" }]
          : [],
  });
  // onlyLowStock cannot be honoured -- stock has no service behind it in this
  // build (see contract.ts). Every row already carries stokTersedia: false so
  // the screen hides the tab that would offer this filter rather than
  // silently ignoring it here.
  return page.items.map(toView);
}

async function getProductDetail(id: string): Promise<ProductView> {
  return toView(await getOne<ProductResponse>(`/products/${id}`));
}

/**
 * `code` is required server-side; the form's own hint says it is "dibuat
 * otomatis jika dikosongkan" (generated automatically if left blank), which
 * the mock honours by auto-numbering. Kept true here rather than sending an
 * empty string and letting the server's 422 contradict the form's own promise.
 */
function generateCode(name: string): string {
  const slug =
    name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "PRODUK";
  return `${slug}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

async function createOrUpdateProduct(
  input: Partial<ProductEntity> & { id?: string },
): Promise<ProductView> {
  const weightKg = input.ukuran !== undefined ? parseWeightKg(input.ukuran) : undefined;

  if (!input.id) {
    const category = await resolveDefaultCategory();
    return toView(
      await send<ProductResponse>("post", "/products", {
        code: input.kode?.trim() || generateCode(input.nama ?? ""),
        name: input.nama,
        category,
        weight_kg: weightKg,
        min_stock: input.stokMinimum,
      }),
    );
  }

  const current = await getOne<ProductResponse>(`/products/${input.id}`);
  const updated = await send<ProductResponse>("put", `/products/${input.id}`, {
    version: current.version,
    code: input.kode,
    name: input.nama,
    weight_kg: weightKg,
    min_stock: input.stokMinimum,
    status: input.aktif !== undefined ? (input.aktif ? "atv" : "ina") : undefined,
  });
  return toView(updated);
}

async function removeProduct(id: string): Promise<void> {
  await send("delete", `/products/${id}`);
}

/**
 * Mock-only: `core.stock_levels` has no service in this build, so there is
 * nowhere to send a stock adjustment. Thrown rather than silently
 * succeeding — ProductListPage only offers this action when
 * `row.stokTersedia` is true, so reaching this is already a bug elsewhere,
 * not a normal path.
 */
async function changeStock(): Promise<ProductView> {
  throw new Error("Penyesuaian stok belum tersedia dari API di build ini.");
}

async function getStockSummary(): Promise<StockSummary> {
  // total/aktif are real counts off the catalogue itself; only the two
  // stock-derived figures are unavailable (see this file's header).
  const rows = await getProducts();
  return {
    total: rows.length,
    aktif: rows.filter((p) => p.aktif).length,
    stokRendah: 0,
    nilaiStok: 0,
    stokTersedia: false,
  };
}

async function exportProducts(): Promise<number> {
  const rows = await getProducts();
  exportCsv(
    `produk-${timestampSuffix()}`,
    ["Kode", "Nama", "Ukuran", "Harga Jual", "Aktif"],
    rows.map((p) => [p.kode, p.nama, p.ukuran, p.hargaJual, p.aktif ? "Ya" : "Tidak"]),
  );
  return rows.length;
}

export const productApiHttp: ProductApi = {
  getProducts,
  getProductDetail,
  createOrUpdateProduct,
  removeProduct,
  changeStock,
  getStockSummary,
  exportProducts,
};
