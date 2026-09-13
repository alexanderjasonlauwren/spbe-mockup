/**
 * Line arithmetic.
 *
 * Every total, price and cost derived from a line set is computed here, so the
 * invoice, the ledger posting and the screens can never disagree about what a
 * delivery was worth.
 */

import type {
  DeliveryLine,
  ID,
  InvoiceLine,
  OrderLine,
  ProductEntity,
} from "@/types/domain";

const round = (n: number) => Math.round(n * 100) / 100;

/** The product a line refers to, or the catalogue default if it has gone. */
export function productOf(
  products: ProductEntity[],
  productId: ID,
): ProductEntity | undefined {
  return products.find((p) => p.id === productId);
}

/**
 * The product new transactions default to.
 *
 * The agency's staple — the highest-volume active line — rather than the first
 * row in the table, so a quick entry with no product chosen lands on the thing
 * that is nearly always right.
 */
export function defaultProduct(products: ProductEntity[]): ProductEntity | undefined {
  return products.find((p) => p.aktif) ?? products[0];
}

export const sumJumlah = (lines: OrderLine[]): number =>
  lines.reduce((s, l) => s + l.jumlah, 0);

export const sumTarget = (lines: DeliveryLine[]): number =>
  lines.reduce((s, l) => s + l.target, 0);

export const sumRealisasi = (lines: DeliveryLine[]): number =>
  lines.reduce((s, l) => s + l.realisasi, 0);

export const sumKembali = (lines: DeliveryLine[]): number =>
  lines.reduce((s, l) => s + (l.kembali ?? 0), 0);

/**
 * Prices a line set from the catalogue, snapshotting name and price.
 *
 * Lines that delivered nothing are dropped: an invoice should not carry a
 * zero-value row for a product the outlet refused.
 */
export function priceLines(
  products: ProductEntity[],
  lines: { productId: ID; jumlah: number }[],
): InvoiceLine[] {
  return lines
    .filter((l) => l.jumlah > 0)
    .map((l) => {
      const p = productOf(products, l.productId);
      const hargaSatuan = p?.hargaJual ?? 0;
      return {
        productId: l.productId,
        nama: p?.nama ?? "Produk tidak dikenal",
        satuan: p?.satuan ?? "unit",
        jumlah: l.jumlah,
        hargaSatuan,
        subtotal: round(l.jumlah * hargaSatuan),
      };
    });
}

/**
 * Cost of goods for what was actually delivered.
 *
 * Per line, from each product's own purchase price — the figure that used to be
 * taken from whichever catalogue row happened to be 3 kg, which made gross
 * margin wrong for every other product in the book.
 */
export function costOfGoods(
  products: ProductEntity[],
  lines: DeliveryLine[],
): number {
  return round(
    lines.reduce(
      (s, l) => s + l.realisasi * (productOf(products, l.productId)?.hargaBeli ?? 0),
      0,
    ),
  );
}

/** Blended unit price, for the single-figure column on older screens. */
export function blendedUnitPrice(lines: InvoiceLine[]): number {
  const jumlah = lines.reduce((s, l) => s + l.jumlah, 0);
  if (jumlah === 0) return 0;
  return round(lines.reduce((s, l) => s + l.subtotal, 0) / jumlah);
}

/** Whether any line on this delivery uses returnable containers. */
export function hasReturnable(
  products: ProductEntity[],
  lines: DeliveryLine[],
): boolean {
  return lines.some((l) => productOf(products, l.productId)?.returnable);
}

/**
 * Spreads a single total across lines, filling each up to its target in order.
 *
 * For the desk-side close, where an operator says "180 arrived" without saying
 * which products fell short. Deterministic and explainable — the shortfall
 * lands on whatever was loaded last — but a driver filing per line is always
 * better, and the sopir console does exactly that.
 */
export function applyScalarRealisasi(
  lines: DeliveryLine[],
  total: number,
): DeliveryLine[] {
  let sisa = Math.max(0, total);
  return lines.map((l) => {
    const diterima = Math.min(l.target, sisa);
    sisa -= diterima;
    return { ...l, realisasi: diterima };
  });
}
