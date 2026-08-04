/**
 * Business rules for the mock backend.
 *
 * These are the operations a real server would own: they validate, they touch
 * more than one collection, and they leave an audit trail. Feature APIs call
 * them; components never do.
 */

import { ApiError, currentActor, mutate, nextId, notify, recordAudit } from "./db";
import { accountByRole, postJournal } from "./ledger";
import {
  addDaysIso,
  issueCreditNote as issueCreditNoteAr,
  applyAllocation,
  issueInvoiceForDelivery,
  pangkalanExposure,
  recordPayment as recordPaymentAr,
  refreshOverdue,
  verifyPaymentRecord,
} from "./ar";
import { isoDate, startOfToday } from "./seed";
import { stampScope } from "./scope";
import type {
  Database,
  DeliveryEntity,
  DriverEntity,
  ID,
  PangkalanEntity,
  PaymentEntity,
  PlanEntity,
  PlanRowEntity,
  InvoiceEntity,
  ProductEntity,
  ReceiptEntity,
  SAEntity,
  UserEntity,
} from "./types";

const fmt = (n: number) => n.toLocaleString("id-ID");

/**
 * Builds a document number from the configured prefix.
 *
 * Numbering is visible on every row and printout, so it belongs in
 * Konfigurasi Sistem rather than scattered through this file.
 */
function docNumber(
  db: Database,
  jenis: keyof Omit<Database["settings"]["penomoran"], "sertakanTanggal">,
  tanggal: string,
  seq?: number,
  pad = 3,
): string {
  const { penomoran } = db.settings;
  const prefix = penomoran[jenis];
  const parts = [prefix];
  if (penomoran.sertakanTanggal) parts.push(tanggal.replace(/-/g, ""));
  if (seq != null) parts.push(String(seq).padStart(pad, "0"));
  return parts.join("-");
}

function requirePlan(db: Database, planId: ID): PlanEntity {
  const plan = db.plans.find((p) => p.id === planId);
  if (!plan) throw new ApiError("Rencana distribusi tidak ditemukan.", 404);
  return plan;
}

function requireSa(db: Database, saId: ID): SAEntity {
  const sa = db.scheduleAgreements.find((s) => s.id === saId);
  if (!sa) throw new ApiError("Schedule Agreement tidak ditemukan.", 404);
  return sa;
}

/** Keeps SA status in step with how much of its quota is drawn down. */
function refreshSaStatus(sa: SAEntity) {
  if (sa.status === "Draft") return;
  const ratio = sa.totalKuota === 0 ? 0 : sa.terpakai / sa.totalKuota;
  const expired = sa.periodeBerakhir < isoDate(startOfToday());
  if (expired || ratio >= 1) sa.status = "Selesai";
  else if (ratio >= 0.95) sa.status = "Limit";
  else sa.status = "Aktif";
}

/* ── schedule agreements ───────────────────────────────────────────────── */

export function createScheduleAgreement(input: {
  nomorSA: string;
  spbe: string;
  periodeMulai: string;
  periodeBerakhir: string;
  totalKuota: number;
  catatan?: string;
  namaDokumen?: string;
}): SAEntity {
  return mutate((db) => {
    if (db.scheduleAgreements.some((s) => s.nomorSA === input.nomorSA)) {
      throw new ApiError(`Nomor SA ${input.nomorSA} sudah terdaftar.`, 409);
    }
    if (input.periodeBerakhir < input.periodeMulai) {
      throw new ApiError("Periode berakhir mendahului periode mulai.");
    }
    if (input.totalKuota <= 0) {
      throw new ApiError("Total kuota harus lebih besar dari nol.");
    }

    const sa: SAEntity = {
      ...stampScope({}),
      id: nextId("sa"),
      nomorSA: input.nomorSA,
      spbe: input.spbe,
      periodeMulai: input.periodeMulai,
      periodeBerakhir: input.periodeBerakhir,
      totalKuota: input.totalKuota,
      terpakai: 0,
      status: "Draft",
      catatan: input.catatan,
      namaDokumen: input.namaDokumen,
      diunggahOleh: "",
      diunggahPada: new Date().toISOString(),
    };
    const entry = recordAudit(db, {
      action: "sa.upload",
      entity: "ScheduleAgreement",
      entityId: sa.id,
      summary: `Mengunggah ${sa.nomorSA} (${fmt(sa.totalKuota)} tabung) dari ${sa.spbe}.`,
    });
    sa.diunggahOleh = entry.actor;
    db.scheduleAgreements.unshift(sa);
    return sa;
  });
}

/** Draft → Aktif. Only an active SA can back a distribution plan. */
export function activateScheduleAgreement(saId: ID): SAEntity {
  return mutate((db) => {
    const sa = requireSa(db, saId);
    if (sa.status !== "Draft") {
      throw new ApiError(`${sa.nomorSA} sudah aktif dan tidak perlu diaktifkan lagi.`);
    }
    sa.status = "Aktif";
    refreshSaStatus(sa);
    recordAudit(db, {
      action: "sa.activate",
      entity: "ScheduleAgreement",
      entityId: sa.id,
      summary: `Mengaktifkan ${sa.nomorSA}.`,
    });
    notify(db, {
      type: "Sistem",
      title: "Schedule Agreement aktif",
      message: `${sa.nomorSA} siap dipakai untuk perencanaan distribusi.`,
      href: "/distribution",
    });
    return sa;
  });
}

export function deleteScheduleAgreement(saId: ID) {
  return mutate((db) => {
    const sa = requireSa(db, saId);
    if (sa.terpakai > 0) {
      throw new ApiError(
        `${sa.nomorSA} sudah terpakai ${fmt(sa.terpakai)} tabung dan tidak dapat dihapus.`,
      );
    }
    db.scheduleAgreements = db.scheduleAgreements.filter((s) => s.id !== saId);
    recordAudit(db, {
      action: "sa.delete",
      entity: "ScheduleAgreement",
      entityId: saId,
      summary: `Menghapus ${sa.nomorSA}.`,
    });
  });
}

/* ── distribution planning ─────────────────────────────────────────────── */

export function createPlan(input: { tanggal: string; saId: ID; catatan?: string }): PlanEntity {
  return mutate((db) => {
    const sa = requireSa(db, input.saId);
    if (sa.status === "Draft") {
      throw new ApiError(`${sa.nomorSA} belum aktif. Aktifkan SA sebelum membuat rencana.`);
    }
    if (db.plans.some((p) => p.tanggal === input.tanggal && p.status !== "Batal")) {
      throw new ApiError(`Sudah ada rencana distribusi untuk tanggal tersebut.`, 409);
    }

    const plan: PlanEntity = {
      ...stampScope({}),
      id: nextId("plan"),
      kode: docNumber(db, "rencana", input.tanggal),
      tanggal: input.tanggal,
      saId: input.saId,
      status: "Draft",
      catatan: input.catatan,
      dibuatOleh: "",
      dibuatPada: new Date().toISOString(),
    };
    const entry = recordAudit(db, {
      action: "plan.create",
      entity: "DistributionPlan",
      entityId: plan.id,
      summary: `Membuat rencana ${plan.kode}.`,
    });
    plan.dibuatOleh = entry.actor;
    db.plans.unshift(plan);
    return plan;
  });
}

/** Replaces a draft plan's stop list. Confirmed plans are frozen. */
export function savePlanRows(
  planId: ID,
  rows: Array<Omit<PlanRowEntity, "planId">>,
): PlanRowEntity[] {
  return mutate((db) => {
    const plan = requirePlan(db, planId);
    if (plan.status !== "Draft") {
      throw new ApiError("Rencana yang sudah dikonfirmasi tidak dapat diubah.");
    }
    for (const row of rows) {
      if (row.jumlahTabung <= 0) {
        throw new ApiError("Jumlah tabung setiap pangkalan harus lebih dari nol.");
      }
    }
    db.planRows = db.planRows.filter((r) => r.planId !== planId);
    const saved = rows.map((r) => ({ ...r, planId }));
    db.planRows.push(...saved);
    recordAudit(db, {
      action: "plan.save_draft",
      entity: "DistributionPlan",
      entityId: planId,
      summary: `Menyimpan draf ${plan.kode}: ${saved.length} pangkalan, ${fmt(
        saved.reduce((s, r) => s + r.jumlahTabung, 0),
      )} tabung.`,
    });
    return saved;
  });
}

/**
 * Confirmation is the pivot of the whole console: quota leaves the SA, surat
 * jalan are issued, and the monitoring board fills up.
 */
export function confirmPlan(planId: ID): { deliveries: number; total: number } {
  return mutate((db) => {
    const plan = requirePlan(db, planId);
    if (plan.status !== "Draft") {
      throw new ApiError("Rencana ini sudah dikonfirmasi.");
    }

    const rows = db.planRows.filter((r) => r.planId === planId);
    if (rows.length === 0) {
      throw new ApiError("Tambahkan minimal satu pangkalan sebelum konfirmasi.");
    }
    const unassigned = rows.filter((r) => !r.driverId);
    if (unassigned.length > 0) {
      throw new ApiError(
        `${unassigned.length} pangkalan belum punya driver. Tetapkan driver sebelum konfirmasi.`,
      );
    }

    // Credit control belongs here — refusing to load a truck for an outlet that
    // is over its limit is the only moment the block actually saves money.
    const diblokir = rows
      .map((r) => ({ row: r, exp: pangkalanExposure(db, r.pangkalanId) }))
      .filter((x) => x.exp.terblokir);
    if (diblokir.length > 0) {
      const names = diblokir
        .map((x) => db.pangkalan.find((p) => p.id === x.row.pangkalanId)?.nama)
        .filter(Boolean);
      throw new ApiError(
        `${names.join(", ")} diblokir karena kredit. ${diblokir[0].exp.alasan} Selesaikan tagihan atau naikkan plafon di data pangkalan.`,
      );
    }

    const total = rows.reduce((s, r) => s + r.jumlahTabung, 0);
    const sa = requireSa(db, plan.saId);
    const sisa = sa.totalKuota - sa.terpakai;
    if (total > sisa) {
      throw new ApiError(
        `Kuota ${sa.nomorSA} tidak mencukupi. Tersisa ${fmt(sisa)} tabung, rencana ini butuh ${fmt(total)}.`,
      );
    }

    // Check truck capacity per driver.
    const perDriver = new Map<ID, number>();
    for (const r of rows) {
      perDriver.set(r.driverId!, (perDriver.get(r.driverId!) ?? 0) + r.jumlahTabung);
    }
    for (const [driverId, muatan] of perDriver) {
      const driver = db.drivers.find((d) => d.id === driverId);
      if (driver && muatan > driver.kapasitas) {
        throw new ApiError(
          `Muatan ${driver.nama} ${fmt(muatan)} tabung melebihi kapasitas ${driver.armada} (${fmt(driver.kapasitas)}).`,
        );
      }
    }

    sa.terpakai += total;
    refreshSaStatus(sa);

    const actor = recordAudit(db, {
      action: "plan.confirm",
      entity: "DistributionPlan",
      entityId: plan.id,
      summary: `Mengonfirmasi ${plan.kode}: ${rows.length} surat jalan, ${fmt(total)} tabung dari ${sa.nomorSA}.`,
    }).actor;

    plan.status = "Terkonfirmasi";
    plan.dikonfirmasiOleh = actor;
    plan.dikonfirmasiPada = new Date().toISOString();

    rows
      .slice()
      .sort((a, b) => a.jamPengiriman.localeCompare(b.jamPengiriman))
      .forEach((row, idx) => {
        db.deliveries.push({
          // Follows its plan, not the active scope.
          tenantId: plan.tenantId,
          branchId: plan.branchId,
          id: nextId("dlv"),
          kode: docNumber(db, "suratJalan", plan.tanggal, idx + 1, 2),
          planId: plan.id,
          planRowId: row.id,
          pangkalanId: row.pangkalanId,
          driverId: row.driverId!,
          tanggal: plan.tanggal,
          jamRencana: row.jamPengiriman,
          target: row.jumlahTabung,
          realisasi: 0,
          status: "Antrian",
        });
      });

    notify(db, {
      type: "Sistem",
      title: `Rencana ${plan.kode} dikonfirmasi`,
      message: `${rows.length} surat jalan terbit, ${fmt(total)} tabung dialokasikan dari ${sa.nomorSA}.`,
      href: "/monitoring",
    });

    if (sa.status === "Limit") {
      notify(db, {
        type: "Alert",
        title: "Kuota SA hampir habis",
        message: `${sa.nomorSA} tersisa ${fmt(sa.totalKuota - sa.terpakai)} tabung setelah konfirmasi ini.`,
        href: "/sa",
      rule: "quotaLow",
      });
    }

    return { deliveries: rows.length, total };
  });
}

/** Rolls a confirmed plan back and returns its quota to the SA. */
export function cancelPlan(planId: ID) {
  return mutate((db) => {
    const plan = requirePlan(db, planId);
    if (plan.status === "Selesai") {
      throw new ApiError("Rencana yang sudah selesai tidak dapat dibatalkan.");
    }
    const deliveries = db.deliveries.filter((d) => d.planId === planId);
    if (deliveries.some((d) => d.status !== "Antrian")) {
      throw new ApiError(
        "Sebagian armada sudah berjalan. Batalkan surat jalan satu per satu di Monitoring.",
      );
    }
    if (plan.status === "Terkonfirmasi") {
      const total = deliveries.reduce((s, d) => s + d.target, 0);
      const sa = requireSa(db, plan.saId);
      sa.terpakai = Math.max(0, sa.terpakai - total);
      refreshSaStatus(sa);
      db.deliveries = db.deliveries.filter((d) => d.planId !== planId);
    }
    plan.status = "Batal";
    recordAudit(db, {
      action: "plan.cancel",
      entity: "DistributionPlan",
      entityId: planId,
      summary: `Membatalkan ${plan.kode} dan mengembalikan kuota ke SA.`,
    });
  });
}

/* ── pangkalan orders ──────────────────────────────────────────────────── */

export function decideOrder(
  orderId: ID,
  action: "approve" | "reject",
  catatan?: string,
) {
  return mutate((db) => {
    const o = db.orders.find((x) => x.id === orderId);
    if (!o) throw new ApiError("Pesanan tidak ditemukan.", 404);
    if (o.status !== "Baru") {
      throw new ApiError(`${o.kode} sudah diproses.`);
    }
    if (action === "reject" && !catatan?.trim()) {
      throw new ApiError("Alasan penolakan wajib diisi.");
    }
    o.status = action === "approve" ? "Disetujui" : "Ditolak";
    if (catatan?.trim()) o.catatan = catatan.trim();
    o.diprosesPada = new Date().toISOString();
    const entry = recordAudit(db, {
      action: `order.${action}`,
      entity: "Order",
      entityId: o.id,
      summary: `${action === "approve" ? "Menyetujui" : "Menolak"} ${o.kode} (${fmt(o.jumlahTabung)} tabung).`,
    });
    o.diprosesOleh = entry.actor;
    return o;
  });
}

/** Pulls approved orders onto a draft plan as stops. */
export function scheduleOrders(planId: ID, orderIds: ID[]) {
  return mutate((db) => {
    const plan = requirePlan(db, planId);
    if (plan.status !== "Draft") {
      throw new ApiError("Hanya rencana berstatus draf yang dapat diisi pesanan.");
    }
    const orders = db.orders.filter((o) => orderIds.includes(o.id));
    if (orders.length === 0) throw new ApiError("Pilih minimal satu pesanan.");
    const notApproved = orders.filter((o) => o.status !== "Disetujui");
    if (notApproved.length > 0) {
      throw new ApiError(
        `${notApproved.length} pesanan belum disetujui dan tidak dapat dijadwalkan.`,
      );
    }

    orders.forEach((o, i) => {
      const existing = db.planRows.find(
        (r) => r.planId === planId && r.pangkalanId === o.pangkalanId,
      );
      if (existing) {
        existing.jumlahTabung += o.jumlahTabung;
      } else {
        const count = db.planRows.filter((r) => r.planId === planId).length;
        db.planRows.push({
          id: nextId("row"),
          planId,
          pangkalanId: o.pangkalanId,
          driverId: null,
          jumlahTabung: o.jumlahTabung,
          jamPengiriman: `${String(Math.min(17, 7 + count + i)).padStart(2, "0")}:00`,
        });
      }
      o.status = "Dijadwalkan";
      o.planId = planId;
    });

    recordAudit(db, {
      action: "order.schedule",
      entity: "DistributionPlan",
      entityId: planId,
      summary: `Menjadwalkan ${orders.length} pesanan ke ${plan.kode}.`,
    });
    return orders.length;
  });
}

/* ── delivery execution ────────────────────────────────────────────────── */

export function updateDeliveryStatus(
  deliveryId: ID,
  status: DeliveryEntity["status"],
  realisasi?: number,
) {
  return mutate((db) => {
    const d = db.deliveries.find((x) => x.id === deliveryId);
    if (!d) throw new ApiError("Surat jalan tidak ditemukan.", 404);

    d.status = status;
    if (realisasi !== undefined) d.realisasi = realisasi;

    if (status === "Proses" && !d.mulaiPada) d.mulaiPada = new Date().toISOString();
    if (status === "Selesai") {
      d.selesaiPada = new Date().toISOString();
      if (realisasi === undefined && d.realisasi === 0) d.realisasi = d.target;
      raiseInvoice(db, d);
    }

    recordAudit(db, {
      action: "delivery.status",
      entity: "Delivery",
      entityId: d.id,
      summary: `${d.kode} → ${status}${realisasi !== undefined ? ` (${fmt(realisasi)} tabung)` : ""}.`,
    });

    // A plan is done once every surat jalan under it is settled.
    const siblings = db.deliveries.filter((x) => x.planId === d.planId);
    if (siblings.every((x) => x.status === "Selesai" || x.status === "Tertunda")) {
      const plan = db.plans.find((p) => p.id === d.planId);
      if (plan && plan.status === "Terkonfirmasi") {
        plan.status = "Selesai";
        db.orders
          .filter((o) => o.planId === plan.id && o.status === "Dijadwalkan")
          .forEach((o) => (o.status = "Selesai"));
      }
    }
    return d;
  });
}

/** A completed drop raises the invoice finance will later collect. */
function raiseInvoice(db: Database, d: DeliveryEntity) {
  issueInvoiceForDelivery(db, d.id, currentActor());
}

/* ── payments ──────────────────────────────────────────────────────────── */

export function decidePayment(
  paymentId: ID,
  action: "verify" | "reject",
  keterangan?: string,
): PaymentEntity {
  return mutate((db) => {
    const actor = currentActor();
    const p = verifyPaymentRecord(db, paymentId, action, keterangan, actor);
    const pkl = db.pangkalan.find((x) => x.id === p.pangkalanId);

    recordAudit(db, {
      action: `payment.${action}`,
      entity: "Payment",
      entityId: p.id,
      summary: `${action === "verify" ? "Memverifikasi" : "Menolak"} ${p.nomor} senilai Rp ${fmt(p.jumlah)}.`,
    });

    if (action === "reject") {
      notify(db, {
        type: "Alert",
        title: "Penerimaan ditolak",
        message: `${p.nomor} dari ${pkl?.nama ?? "pangkalan"} ditolak: ${p.keterangan}`,
        href: "/payments",
        rule: "paymentPending",
      });
    }
    return p;
  });
}

/** Records cash received, optionally applying it to invoices in one step. */
export function createPayment(input: {
  pangkalanId: ID;
  jumlah: number;
  tanggal: string;
  bank: PaymentEntity["bank"];
  noRekening: string;
  rekeningTujuanId?: ID;
  buktiTransfer?: string;
  keterangan?: string;
  alokasi?: { invoiceId: ID; jumlah: number }[];
}) {
  return mutate((db) => {
    const actor = currentActor();
    const p = recordPaymentAr(db, input, actor);
    recordAudit(db, {
      action: "payment.create",
      entity: "Payment",
      entityId: p.id,
      summary: `Mencatat penerimaan ${p.nomor} senilai Rp ${fmt(p.jumlah)}.`,
    });
    return p;
  });
}

export function allocatePayment(
  paymentId: ID,
  alokasi: { invoiceId: ID; jumlah: number }[],
) {
  return mutate((db) => applyAllocation(db, paymentId, alokasi, currentActor()));
}

export function createCreditNote(input: {
  pangkalanId: ID;
  invoiceId: ID | null;
  jumlah: number;
  alasan: string;
}) {
  return mutate((db) => {
    const actor = currentActor();
    const note = issueCreditNoteAr(db, input, actor);
    recordAudit(db, {
      action: "creditNote.create",
      entity: "CreditNote",
      entityId: note.id,
      summary: `Menerbitkan nota kredit ${note.nomor} senilai Rp ${fmt(note.jumlah)} — ${note.alasan}`,
    });
    return note;
  });
}

/** Recomputes overdue status; called when the finance pages load. */
export function syncReceivables() {
  return mutate((db) => refreshOverdue(db));
}

/* ── OCR receipts ──────────────────────────────────────────────────────── */

/** Accepting a scanned receipt turns it into a payment awaiting verification. */
export function validateReceipt(
  receiptId: ID,
  edits: Partial<Pick<ReceiptEntity, "pangkalanId" | "nomorKwitansi" | "tanggalKwitansi" | "jumlahTabung" | "nominal" | "bank">>,
): ReceiptEntity {
  return mutate((db) => {
    const r = db.receipts.find((x) => x.id === receiptId);
    if (!r) throw new ApiError("Kwitansi tidak ditemukan.", 404);
    if (r.status !== "Menunggu Review") {
      throw new ApiError(`${r.nomorKwitansi} sudah ditinjau.`);
    }
    Object.assign(r, edits);
    if (!r.pangkalanId) {
      throw new ApiError("Pilih pangkalan sebelum memvalidasi kwitansi.");
    }
    if (r.nominal <= 0) throw new ApiError("Nominal kwitansi harus lebih dari nol.");

    r.status = "Tervalidasi";
    r.ditinjauPada = new Date().toISOString();

    // A validated scan is a billable event, so it raises a proper invoice.
    const pkl = db.pangkalan.find((p) => p.id === r.pangkalanId);
    const seq = db.invoices.length + 1;
    const invoice: InvoiceEntity = {
      tenantId: pkl?.tenantId ?? db.tenant.id,
      branchId: pkl?.branchId ?? db.branches[0]?.id ?? "",
      id: nextId("inv"),
      nomor: docNumber(db, "invoice", r.tanggalKwitansi, seq),
      pangkalanId: r.pangkalanId,
      deliveryId: null,
      tanggal: r.tanggalKwitansi,
      jatuhTempo: addDaysIso(r.tanggalKwitansi, pkl?.termin ?? 0),
      jumlahTabung: r.jumlahTabung,
      hargaSatuan: r.jumlahTabung > 0 ? Math.round(r.nominal / r.jumlahTabung) : 0,
      subtotal: r.nominal,
      pajak: 0,
      total: r.nominal,
      terbayar: 0,
      kredit: 0,
      status: "Terbit",
      catatan: `Hasil pindai ${r.nomorKwitansi}.`,
      dibuatOleh: currentActor(),
    };
    db.invoices.unshift(invoice);
    postJournal(db, {
      scope: { tenantId: invoice.tenantId, branchId: invoice.branchId },
      tanggal: invoice.tanggal,
      keterangan: `${invoice.nomor} — hasil pindai kwitansi`,
      sumber: { tipe: "invoice", id: invoice.id },
      aktor: currentActor(),
      lines: [
        { akunId: accountByRole(db, "piutang").id, debit: invoice.total, kredit: 0 },
        { akunId: accountByRole(db, "pendapatan").id, debit: 0, kredit: invoice.total },
      ],
    });
    r.paymentId = invoice.id;

    const entry = recordAudit(db, {
      action: "receipt.validate",
      entity: "Receipt",
      entityId: r.id,
      summary: `Memvalidasi ${r.nomorKwitansi} dan menerbitkan ${invoice.nomor}.`,
    });
    r.ditinjauOleh = entry.actor;
    return r;
  });
}

export function rejectReceipt(receiptId: ID, alasan: string): ReceiptEntity {
  return mutate((db) => {
    const r = db.receipts.find((x) => x.id === receiptId);
    if (!r) throw new ApiError("Kwitansi tidak ditemukan.", 404);
    if (!alasan.trim()) throw new ApiError("Alasan penolakan wajib diisi.");
    r.status = "Ditolak";
    r.ditinjauPada = new Date().toISOString();
    const entry = recordAudit(db, {
      action: "receipt.reject",
      entity: "Receipt",
      entityId: r.id,
      summary: `Menolak ${r.nomorKwitansi}: ${alasan.trim()}`,
    });
    r.ditinjauOleh = entry.actor;
    return r;
  });
}

/* ── master data ───────────────────────────────────────────────────────── */

export function savePangkalan(
  input: Partial<PangkalanEntity> & { id?: ID },
): PangkalanEntity {
  return mutate((db) => {
    if (!input.nama?.trim()) throw new ApiError("Nama pangkalan wajib diisi.");

    if (input.id) {
      const existing = db.pangkalan.find((p) => p.id === input.id);
      if (!existing) throw new ApiError("Pangkalan tidak ditemukan.", 404);
      Object.assign(existing, input);
      recordAudit(db, {
        action: "pangkalan.update",
        entity: "Pangkalan",
        entityId: existing.id,
        summary: `Memperbarui data ${existing.nama}.`,
      });
      return existing;
    }

    const seq = db.pangkalan.length + 1;
    const created: PangkalanEntity = {
      ...stampScope({}),
      id: nextId("pkl"),
      kode: input.kode?.trim() || `PKL-${String(seq).padStart(4, "0")}`,
      nama: input.nama.trim(),
      alamat: input.alamat ?? "",
      kecamatan: input.kecamatan ?? "",
      kota: input.kota ?? "Kota Bekasi",
      lat: input.lat ?? -6.24,
      lng: input.lng ?? 107.0,
      penanggungJawab: input.penanggungJawab ?? "",
      telepon: input.telepon ?? "",
      status: input.status ?? "Aktif",
      kuotaBulanan: input.kuotaBulanan ?? 600,
      termin: input.termin ?? 7,
      batasKredit: input.batasKredit ?? 0,
      blokirOtomatis: input.blokirOtomatis ?? true,
      terdaftarPada: isoDate(startOfToday()),
    };
    if (db.pangkalan.some((p) => p.kode === created.kode)) {
      throw new ApiError(`Kode ${created.kode} sudah dipakai pangkalan lain.`, 409);
    }
    db.pangkalan.unshift(created);
    recordAudit(db, {
      action: "pangkalan.create",
      entity: "Pangkalan",
      entityId: created.id,
      summary: `Mendaftarkan pangkalan ${created.nama} (${created.kode}).`,
    });
    return created;
  });
}

export function deletePangkalan(id: ID) {
  return mutate((db) => {
    const pkl = db.pangkalan.find((p) => p.id === id);
    if (!pkl) throw new ApiError("Pangkalan tidak ditemukan.", 404);
    const open = db.deliveries.some(
      (d) => d.pangkalanId === id && d.status !== "Selesai",
    );
    if (open) {
      throw new ApiError(
        `${pkl.nama} masih punya surat jalan berjalan. Selesaikan pengiriman sebelum menghapus.`,
      );
    }
    db.pangkalan = db.pangkalan.filter((p) => p.id !== id);
    recordAudit(db, {
      action: "pangkalan.delete",
      entity: "Pangkalan",
      entityId: id,
      summary: `Menghapus pangkalan ${pkl.nama}.`,
    });
  });
}

export function saveDriver(input: Partial<DriverEntity> & { id?: ID }): DriverEntity {
  return mutate((db) => {
    if (!input.nama?.trim()) throw new ApiError("Nama driver wajib diisi.");
    if (input.plat && !input.id && db.drivers.some((d) => d.plat === input.plat)) {
      throw new ApiError(`Plat ${input.plat} sudah terdaftar pada armada lain.`, 409);
    }

    if (input.id) {
      const existing = db.drivers.find((d) => d.id === input.id);
      if (!existing) throw new ApiError("Driver tidak ditemukan.", 404);
      Object.assign(existing, input);
      recordAudit(db, {
        action: "driver.update",
        entity: "Driver",
        entityId: existing.id,
        summary: `Memperbarui data ${existing.nama} (${existing.plat}).`,
      });
      return existing;
    }

    const created: DriverEntity = {
      ...stampScope({}),
      id: nextId("drv"),
      nama: input.nama.trim(),
      telepon: input.telepon ?? "",
      nomorSim: input.nomorSim ?? "",
      plat: input.plat ?? "",
      armada: input.armada ?? "",
      kapasitas: input.kapasitas ?? 240,
      status: input.status ?? "Standby",
      bergabungPada: isoDate(startOfToday()),
    };
    db.drivers.unshift(created);
    recordAudit(db, {
      action: "driver.create",
      entity: "Driver",
      entityId: created.id,
      summary: `Menambahkan driver ${created.nama} (${created.plat}).`,
    });
    return created;
  });
}

export function deleteDriver(id: ID) {
  return mutate((db) => {
    const drv = db.drivers.find((d) => d.id === id);
    if (!drv) throw new ApiError("Driver tidak ditemukan.", 404);
    if (db.deliveries.some((d) => d.driverId === id && d.status !== "Selesai")) {
      throw new ApiError(
        `${drv.nama} masih menjalankan surat jalan hari ini. Tugaskan ulang sebelum menghapus.`,
      );
    }
    db.drivers = db.drivers.filter((d) => d.id !== id);
    recordAudit(db, {
      action: "driver.delete",
      entity: "Driver",
      entityId: id,
      summary: `Menghapus driver ${drv.nama}.`,
    });
  });
}

export function saveUser(input: Partial<UserEntity> & { id?: ID }): UserEntity {
  return mutate((db) => {
    if (!input.nama?.trim()) throw new ApiError("Nama pengguna wajib diisi.");
    if (!input.email?.trim()) throw new ApiError("Email wajib diisi.");

    const clash = db.users.find(
      (u) => u.email.toLowerCase() === input.email!.toLowerCase() && u.id !== input.id,
    );
    if (clash) throw new ApiError(`Email ${input.email} sudah dipakai.`, 409);

    if (input.id) {
      const existing = db.users.find((u) => u.id === input.id);
      if (!existing) throw new ApiError("Pengguna tidak ditemukan.", 404);
      Object.assign(existing, input);
      recordAudit(db, {
        action: "user.update",
        entity: "User",
        entityId: existing.id,
        summary: `Memperbarui akun ${existing.nama} (${existing.role}).`,
      });
      return existing;
    }

    const created: UserEntity = {
      id: nextId("usr"),
      nama: input.nama.trim(),
      email: input.email.trim(),
      role: input.role ?? "staff",
      telepon: input.telepon ?? "",
      cabang: input.cabang ?? "Semua cabang",
      branchIds: input.branchIds ?? [],
      scopeType: input.scopeType ?? "tenant",
      status: "Diundang",
      dibuatPada: isoDate(startOfToday()),
    };
    db.users.unshift(created);
    recordAudit(db, {
      action: "user.invite",
      entity: "User",
      entityId: created.id,
      summary: `Mengundang ${created.nama} sebagai ${created.role}.`,
    });
    notify(db, {
      type: "Sistem",
      title: "Undangan pengguna terkirim",
      message: `${created.nama} diundang bergabung sebagai ${created.role}.`,
      href: "/users",
    });
    return created;
  });
}

export function deleteUser(id: ID) {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === id);
    if (!user) throw new ApiError("Pengguna tidak ditemukan.", 404);
    if (user.role === "admin" && db.users.filter((u) => u.role === "admin").length === 1) {
      throw new ApiError("Sistem harus punya minimal satu admin.");
    }
    db.users = db.users.filter((u) => u.id !== id);
    recordAudit(db, {
      action: "user.delete",
      entity: "User",
      entityId: id,
      summary: `Menghapus akun ${user.nama}.`,
    });
  });
}

export function saveProduct(
  input: Partial<ProductEntity> & { id?: ID },
): ProductEntity {
  return mutate((db) => {
    if (!input.nama?.trim()) throw new ApiError("Nama produk wajib diisi.");
    if ((input.hargaJual ?? 0) <= 0) throw new ApiError("Harga jual harus lebih dari nol.");

    if (input.id) {
      const existing = db.products.find((p) => p.id === input.id);
      if (!existing) throw new ApiError("Produk tidak ditemukan.", 404);
      Object.assign(existing, input);
      recordAudit(db, {
        action: "product.update",
        entity: "Product",
        entityId: existing.id,
        summary: `Memperbarui produk ${existing.nama}.`,
      });
      return existing;
    }

    const seq = db.products.length + 1;
    const created: ProductEntity = {
      id: nextId("prd"),
      kode: input.kode?.trim() || `SKU-${String(seq).padStart(4, "0")}`,
      nama: input.nama.trim(),
      ukuran: input.ukuran ?? "",
      hargaJual: input.hargaJual!,
      hargaBeli: input.hargaBeli ?? 0,
      stok: input.stok ?? 0,
      stokMinimum: input.stokMinimum ?? 0,
      aktif: input.aktif ?? true,
    };
    db.products.unshift(created);
    recordAudit(db, {
      action: "product.create",
      entity: "Product",
      entityId: created.id,
      summary: `Menambahkan produk ${created.nama} (${created.kode}).`,
    });
    return created;
  });
}

export function deleteProduct(id: ID) {
  return mutate((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new ApiError("Produk tidak ditemukan.", 404);
    db.products = db.products.filter((x) => x.id !== id);
    recordAudit(db, {
      action: "product.delete",
      entity: "Product",
      entityId: id,
      summary: `Menghapus produk ${p.nama}.`,
    });
  });
}

export function adjustStock(id: ID, delta: number, alasan: string) {
  return mutate((db) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) throw new ApiError("Produk tidak ditemukan.", 404);
    if (delta === 0) throw new ApiError("Masukkan jumlah penyesuaian.");
    if (p.stok + delta < 0) {
      throw new ApiError(`Stok ${p.nama} tidak cukup untuk pengurangan sebesar ${fmt(Math.abs(delta))}.`);
    }
    p.stok += delta;
    recordAudit(db, {
      action: "product.stock",
      entity: "Product",
      entityId: p.id,
      summary: `Menyesuaikan stok ${p.nama} ${delta > 0 ? "+" : ""}${fmt(delta)} — ${alasan}.`,
    });
    if (p.aktif && p.stok < p.stokMinimum) {
      notify(db, {
        type: "Alert",
        title: "Stok di bawah minimum",
        message: `${p.nama} tersisa ${fmt(p.stok)}, di bawah ambang ${fmt(p.stokMinimum)}.`,
        href: "/products",
      rule: "stockLow",
      });
    }
    return p;
  });
}

export function saveSettings(patch: Partial<Database["settings"]>) {
  return mutate((db) => {
    db.settings = { ...db.settings, ...patch };
    recordAudit(db, {
      action: "settings.update",
      entity: "Settings",
      entityId: "app",
      summary: "Memperbarui pengaturan aplikasi.",
    });
    return db.settings;
  });
}

/**
 * Nudges today's run forward: queued drops start, running drops load, finished
 * drops raise invoices. Called on a timer so the monitoring board breathes.
 */
export function advanceOperations(): boolean {
  return mutate((db) => {
    const today = isoDate(startOfToday());
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    let changed = false;

    for (const d of db.deliveries) {
      if (d.tanggal !== today) continue;
      const planned = Number(d.jamRencana.slice(0, 2)) * 60 + Number(d.jamRencana.slice(3));

      if (d.status === "Antrian" && minutes >= planned - 20) {
        d.status = "Proses";
        d.mulaiPada = now.toISOString();
        const pkl = db.pangkalan.find((p) => p.id === d.pangkalanId);
        if (pkl) {
          d.driverLat = pkl.lat + (Math.random() - 0.5) * 0.03;
          d.driverLng = pkl.lng + (Math.random() - 0.5) * 0.03;
        }
        changed = true;
      } else if (d.status === "Proses") {
        const step = Math.ceil(d.target * (0.08 + Math.random() * 0.12));
        d.realisasi = Math.min(d.target, d.realisasi + step);
        const pkl = db.pangkalan.find((p) => p.id === d.pangkalanId);
        if (pkl && d.driverLat != null && d.driverLng != null) {
          d.driverLat += (pkl.lat - d.driverLat) * 0.35;
          d.driverLng += (pkl.lng - d.driverLng) * 0.35;
        }
        if (d.realisasi >= d.target) {
          d.status = "Selesai";
          d.selesaiPada = now.toISOString();
          d.driverLat = undefined;
          d.driverLng = undefined;
          raiseInvoice(db, d);
        }
        changed = true;
      }
    }

    if (changed) {
      for (const driver of db.drivers) {
        if (driver.status === "Cuti") continue;
        const mine = db.deliveries.filter(
          (d) => d.tanggal === today && d.driverId === driver.id,
        );
        if (mine.length === 0) continue;
        if (mine.some((d) => d.status === "Proses")) driver.status = "Dalam Perjalanan";
        else if (mine.every((d) => d.status === "Selesai" || d.status === "Tertunda"))
          driver.status = "Selesai";
        else driver.status = "Standby";
      }
    }

    return changed;
  });
}
