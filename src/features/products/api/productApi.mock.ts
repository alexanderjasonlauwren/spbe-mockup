import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import { adjustStock, deleteProduct, saveProduct } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import type { ProductEntity } from "@/types/domain";
import type { ProductApi, ProductFilters, ProductView, StockSummary } from "./contract";

export function toView(p: ProductEntity): ProductView {
  const margin = p.hargaJual - p.hargaBeli;
  return {
    ...p,
    margin,
    marginPersen: p.hargaJual === 0 ? 0 : (margin / p.hargaJual) * 100,
    stokRendah: p.aktif && p.stok < p.stokMinimum,
    nilaiStok: p.stok * p.hargaBeli,
    stokTersedia: true,
  };
}

async function getProducts(filters?: ProductFilters): Promise<ProductView[]> {
  await latency("read");
  return scopedDb()
    .products.map(toView)
    .filter((p) => {
      if (filters?.onlyLowStock && !p.stokRendah) return false;
      if (filters?.onlyActive && !p.aktif) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return p.nama.toLowerCase().includes(q) || p.kode.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

async function getProductDetail(id: string): Promise<ProductView> {
  await latency("read");
  const p = scopedDb().products.find((x) => x.id === id);
  if (!p) throw new Error("Produk tidak ditemukan.");
  return toView(p);
}

async function createOrUpdateProduct(
  input: Partial<ProductEntity> & { id?: string },
): Promise<ProductView> {
  await latency("write");
  return toView(saveProduct(input));
}

async function removeProduct(id: string): Promise<void> {
  await latency("write");
  deleteProduct(id);
}

async function changeStock(id: string, delta: number, alasan: string): Promise<ProductView> {
  await latency("write");
  return toView(adjustStock(id, delta, alasan));
}

async function getStockSummary(): Promise<StockSummary> {
  await latency("read");
  const products = scopedDb().products.map(toView);
  return {
    total: products.length,
    aktif: products.filter((p) => p.aktif).length,
    stokRendah: products.filter((p) => p.stokRendah).length,
    nilaiStok: products.reduce((s, p) => s + p.nilaiStok, 0),
    stokTersedia: true,
  };
}

async function exportProducts(): Promise<number> {
  await latency("read");
  const rows = await getProducts();
  exportCsv(
    `produk-${timestampSuffix()}`,
    [
      "Kode",
      "Nama",
      "Ukuran",
      "Harga Beli",
      "Harga Jual",
      "Margin",
      "Stok",
      "Stok Minimum",
      "Nilai Stok",
      "Aktif",
    ],
    rows.map((p) => [
      p.kode,
      p.nama,
      p.ukuran,
      p.hargaBeli,
      p.hargaJual,
      p.margin,
      p.stok,
      p.stokMinimum,
      p.nilaiStok,
      p.aktif ? "Ya" : "Tidak",
    ]),
  );
  return rows.length;
}

export const productApiMock: ProductApi = {
  getProducts,
  getProductDetail,
  createOrUpdateProduct,
  removeProduct,
  changeStock,
  getStockSummary,
  exportProducts,
};
