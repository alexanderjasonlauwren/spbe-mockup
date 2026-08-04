import { latency, mutate, nextId, recordAudit } from "@/mocks/db";
import { stampScope, scopedDb } from "@/mocks/scope";
import { rejectReceipt, validateReceipt } from "@/mocks/rules";
import { isoDate, startOfToday } from "@/mocks/seed";
import type { BankNameEntity, ReceiptEntity } from "@/mocks/types";

export interface ReceiptView {
  id: string;
  namaBerkas: string;
  pangkalanId: string | null;
  pangkalan: string;
  nomorKwitansi: string;
  tanggalKwitansi: string;
  jumlahTabung: number;
  nominal: number;
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
  return {
    id: r.id,
    namaBerkas: r.namaBerkas,
    pangkalanId: r.pangkalanId,
    pangkalan:
      db.pangkalan.find((p) => p.id === r.pangkalanId)?.nama ?? "Belum dikenali",
    nomorKwitansi: r.nomorKwitansi,
    tanggalKwitansi: r.tanggalKwitansi,
    jumlahTabung: r.jumlahTabung,
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
  const aktif = db.pangkalan.filter((p) => p.status === "Aktif");
  const confidence = 0.58 + Math.random() * 0.41;
  const recognised = confidence > 0.78;
  const jumlah = Math.round((4 + Math.random() * 16)) * 10;

  return mutate((database) => {
    const receipt: ReceiptEntity = {
      ...stampScope({}),
      id: nextId("ocr"),
      namaBerkas: file.name,
      pangkalanId: recognised
        ? aktif[Math.floor(Math.random() * aktif.length)].id
        : null,
      nomorKwitansi: recognised
        ? `KW/${Math.floor(1000 + Math.random() * 9000)}/${new Date().getFullYear()}`
        : "",
      tanggalKwitansi: isoDate(startOfToday()),
      jumlahTabung: jumlah,
      nominal: jumlah * database.settings.hargaPerTabung,
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
      "pangkalanId" | "nomorKwitansi" | "tanggalKwitansi" | "jumlahTabung" | "nominal" | "bank"
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
