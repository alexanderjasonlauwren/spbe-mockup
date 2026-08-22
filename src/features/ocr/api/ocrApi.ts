import { latency, mutate, nextId, recordAudit } from "@/mocks/db";
import { stampScope, scopedDb } from "@/mocks/scope";
import { rejectReceipt, validateReceipt } from "@/mocks/rules";
import { isoDate, startOfToday } from "@/mocks/seed";
import { productOf } from "@/mocks/lines";
import type { BankNameEntity, ReceiptEntity } from "@/mocks/types";

/** A scanned line, with whatever the matcher could resolve attached. */
export interface ReceiptLineView {
  productId: string | null;
  /** The catalogue name once matched, otherwise the raw scanned text. */
  nama: string;
  namaTerbaca: string;
  satuan: string;
  jumlah: number;
  hargaSatuan: number;
  subtotal: number;
  /** Catalogue price, when it differs from what the paper charged. */
  hargaKatalog?: number;
}

export interface ReceiptView {
  id: string;
  namaBerkas: string;
  outletId: string | null;
  outlet: string;
  nomorKwitansi: string;
  tanggalKwitansi: string;
  lines: ReceiptLineView[];
  jumlahUnit: number;
  /** The total printed on the paper. */
  nominal: number;
  /** What the items actually add up to. Divergence is a review signal. */
  nominalRincian: number;
  /** Lines the scan could not match to a catalogue product. */
  belumDicocokkan: number;
  bank: BankNameEntity | null;
  /** 0..1 — anything under 0.8 is flagged for a human to check. */
  keyakinan: number;
  status: ReceiptEntity["status"];
  diunggahPada: string;
  ditinjauOleh?: string;
  ditinjauPada?: string;
  /** Invoice raised when the scan was accepted. */
  kodePembayaran?: string;
}

function toView(r: ReceiptEntity): ReceiptView {
  const db = scopedDb();
  const lines: ReceiptLineView[] = r.lines.map((l) => {
    const prod = l.productId ? productOf(db.products, l.productId) : undefined;
    return {
      productId: l.productId,
      nama: prod?.nama ?? l.namaTerbaca,
      namaTerbaca: l.namaTerbaca,
      satuan: prod?.satuan ?? "unit",
      jumlah: l.jumlah,
      hargaSatuan: l.hargaSatuan,
      subtotal: l.jumlah * l.hargaSatuan,
      // Surfaced only when it disagrees — a counter price that drifted from the
      // catalogue is worth a second look, an identical one is noise.
      hargaKatalog:
        prod && prod.hargaJual !== l.hargaSatuan ? prod.hargaJual : undefined,
    };
  });

  return {
    lines,
    jumlahUnit: r.jumlahUnit,
    nominalRincian: lines.reduce((s, l) => s + l.subtotal, 0),
    belumDicocokkan: r.lines.filter((l) => !l.productId).length,
    id: r.id,
    namaBerkas: r.namaBerkas,
    outletId: r.outletId,
    outlet:
      db.outlets.find((p) => p.id === r.outletId)?.nama ?? "Belum dikenali",
    nomorKwitansi: r.nomorKwitansi,
    tanggalKwitansi: r.tanggalKwitansi,
    nominal: r.nominal,
    bank: r.bank,
    keyakinan: r.keyakinan,
    status: r.status,
    diunggahPada: r.diunggahPada,
    ditinjauOleh: r.ditinjauOleh,
    ditinjauPada: r.ditinjauPada,
    kodePembayaran: db.payments.find((p) => p.id === r.paymentId)?.nomor,
  };
}

export async function getReceipts(
  status?: ReceiptEntity["status"],
): Promise<ReceiptView[]> {
  await latency("read");
  return scopedDb()
    .receipts.filter((r) => !status || r.status === status)
    .map(toView)
    .sort((a, b) => b.diunggahPada.localeCompare(a.diunggahPada));
}

/**
 * Stands in for the scan pipeline: a real deployment posts the image to an OCR
 * service and gets these fields back with per-field confidence. Low-confidence
 * reads come back blank so a human fills them rather than trusting a guess.
 */
export async function uploadReceipt(file: File): Promise<ReceiptView> {
  await latency("upload");

  const db = scopedDb();
  const aktif = db.outlets.filter((p) => p.status === "Aktif");
  const confidence = 0.58 + Math.random() * 0.41;
  const recognised = confidence > 0.78;

  // Stands in for the extractor returning line items. Real engines read the
  // item table and the printed total as two separate passes, which is why a
  // low-confidence scan can produce lines it cannot match to the catalogue.
  const katalog = db.products.filter((p) => p.aktif);
  const dipakai = [
    katalog[0],
    ...(Math.random() > 0.6 && katalog[1] ? [katalog[1]] : []),
  ].filter(Boolean);

  const lines = dipakai.map((prod) => ({
    productId: recognised ? prod.id : null,
    namaTerbaca: recognised ? prod.nama : prod.nama.toUpperCase().replace(/ /g, ""),
    jumlah: Math.round(2 + Math.random() * 10) * 5,
    hargaSatuan: prod.hargaJual,
  }));
  const jumlah = lines.reduce((s, l) => s + l.jumlah, 0);
  const nominal = lines.reduce((s, l) => s + l.jumlah * l.hargaSatuan, 0);

  return mutate((database) => {
    const receipt: ReceiptEntity = {
      ...stampScope({}),
      id: nextId("ocr"),
      namaBerkas: file.name,
      outletId: recognised
        ? aktif[Math.floor(Math.random() * aktif.length)].id
        : null,
      nomorKwitansi: recognised
        ? `KW/${Math.floor(1000 + Math.random() * 9000)}/${new Date().getFullYear()}`
        : "",
      tanggalKwitansi: isoDate(startOfToday()),
      lines,
      jumlahUnit: jumlah,
      nominal,
      bank: recognised ? "BCA" : null,
      keyakinan: confidence,
      status: "Menunggu Review",
      diunggahPada: new Date().toISOString(),
    };
    database.receipts.unshift(receipt);
    recordAudit(database, {
      action: "receipt.upload",
      entity: "Receipt",
      entityId: receipt.id,
      summary: `Memindai ${file.name} (keyakinan ${Math.round(confidence * 100)}%).`,
    });
    return toView(receipt);
  });
}

export async function acceptReceipt(
  id: string,
  edits: Partial<
    Pick<
      ReceiptEntity,
      | "outletId"
      | "nomorKwitansi"
      | "tanggalKwitansi"
      | "lines"
      | "nominal"
      | "bank"
    >
  >,
): Promise<ReceiptView> {
  await latency("write");
  return toView(validateReceipt(id, edits));
}

export async function declineReceipt(id: string, alasan: string): Promise<ReceiptView> {
  await latency("write");
  return toView(rejectReceipt(id, alasan));
}

export async function getOcrSummary() {
  await latency("read");
  const receipts = scopedDb().receipts;
  const reviewed = receipts.filter((r) => r.status !== "Menunggu Review");
  return {
    menungguReview: receipts.filter((r) => r.status === "Menunggu Review").length,
    tervalidasi: receipts.filter((r) => r.status === "Tervalidasi").length,
    ditolak: receipts.filter((r) => r.status === "Ditolak").length,
    rerataKeyakinan:
      receipts.length === 0
        ? 0
        : receipts.reduce((s, r) => s + r.keyakinan, 0) / receipts.length,
    nilaiTervalidasi: reviewed
      .filter((r) => r.status === "Tervalidasi")
      .reduce((s, r) => s + r.nominal, 0),
  };
}
