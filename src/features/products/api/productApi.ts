import { getDb, latency } from "@/mocks/db";
import { adjustStock, deleteProduct, saveProduct } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import type { ProductEntity } from "@/mocks/types";

export interface ProductView extends ProductEntity {
  /** Selling price minus cost, per unit. */
  margin: number;
  marginPersen: number;
  stokRendah: boolean;
  nilaiStok: number;
}

function toView(p: ProductEntity): ProductView {
  const margin = p.hargaJual - p.hargaBeli;
  return {
    ...p,
    margin,
    marginPersen: p.hargaJual === 0 ? 0 : (margin / p.hargaJual) * 100,
    stokRendah: p.aktif && p.stok < p.stokMinimum,
    nilaiStok: p.stok * p.hargaBeli,
  };
}

export async function getProducts(filters?: {
  search?: string;
  onlyLowStock?: boolean;
  onlyActive?: boolean;
}): Promise<ProductView[]> {
  await latency("read");
  return getDb()
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

export async function getProductDetail(id: string): Promise<ProductView> {
  await latency("read");
  const p = getDb().products.find((x) => x.id === id);
  if (!p) throw new Error("Produk tidak ditemukan.");
  return toView(p);
}

export async function createOrUpdateProduct(input: Partial<ProductEntity> & { id?: string }) {
  await latency("write");
  return toView(saveProduct(input));
}

export async function removeProduct(id: string) {
  await latency("write");
  deleteProduct(id);
}

export async function changeStock(id: string, delta: number, alasan: string) {
  await latency("write");
  return toView(adjustStock(id, delta, alasan));
}

export async function getStockSummary() {
  await latency("read");
  const products = getDb().products.map(toView);
  return {
    total: products.length,
    aktif: products.filter((p) => p.aktif).length,
    stokRendah: products.filter((p) => p.stokRendah).length,
    nilaiStok: products.reduce((s, p) => s + p.nilaiStok, 0),
  };
}

export async function exportProducts() {
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
