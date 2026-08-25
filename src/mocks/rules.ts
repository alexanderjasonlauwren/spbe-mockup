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
  outletExposure,
  recordPayment as recordPaymentAr,
  refreshOverdue,
  verifyPaymentRecord,
} from "./ar";
import { isoDate, startOfToday } from "./seed";
import { distanceMeters, type GeoStamp } from "@/lib/geo";
import {
  applyScalarRealisasi,
  productOf,
  sumJumlah,
  sumKembali,
  sumRealisasi,
  sumTarget,
} from "./lines";
import { getActiveScope, stampScope } from "./scope";
import type {
  Database,
  DeliveryEntity,
  DeliveryEventEntity,
  DeliveryEventType,
  DriverEntity,
  ID,
  DeliveryLine,
  OutletEntity,
  PaymentEntity,
  PlanEntity,
  PlanRowEntity,
  InvoiceEntity,
  ProductEntity,
  ReceiptEntity,
  SAEntity,
  UserEntity,
} from "./types";
import { outletLabel, outletLabelTitle, unitLabel } from "@/lib/lexicon";

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
  supplier: string;
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
      supplier: input.supplier,
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
      summary: `Mengunggah ${sa.nomorSA} (${fmt(sa.totalKuota)} ${unitLabel()}) dari ${sa.supplier}.`,
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
        `${sa.nomorSA} sudah terpakai ${fmt(sa.terpakai)} ${unitLabel()} dan tidak dapat dihapus.`,
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
      if (row.jumlahUnit <= 0) {
        throw new ApiError(`Jumlah ${unitLabel()} setiap ${outletLabel()} harus lebih dari nol.`);
      }
    }
    db.planRows = db.planRows.filter((r) => r.planId !== planId);
    // Lines are authoritative; the scalar beside them is recomputed, never
    // trusted from the caller.
    const saved = rows.map((r) => ({
      ...r,
      planId,
      jumlahUnit: r.lines.length > 0 ? sumJumlah(r.lines) : r.jumlahUnit,
    }));
    db.planRows.push(...saved);
    recordAudit(db, {
      action: "plan.save_draft",
      entity: "DistributionPlan",
      entityId: planId,
      summary: `Menyimpan draf ${plan.kode}: ${saved.length} outlet, ${fmt(
        saved.reduce((s, r) => s + r.jumlahUnit, 0),
      )} ${unitLabel()}.`,
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
      throw new ApiError(`Tambahkan minimal satu ${outletLabel()} sebelum konfirmasi.`);
    }
    const unassigned = rows.filter((r) => !r.driverId);
    if (unassigned.length > 0) {
      throw new ApiError(
        `${unassigned.length} ${outletLabel()} belum punya driver. Tetapkan driver sebelum konfirmasi.`,
      );
    }

    // Credit control belongs here — refusing to load a truck for an outlet that
    // is over its limit is the only moment the block actually saves money.
    const diblokir = rows
      .map((r) => ({ row: r, exp: outletExposure(db, r.outletId) }))
      .filter((x) => x.exp.terblokir);
    if (diblokir.length > 0) {
      const names = diblokir
        .map((x) => db.outlets.find((p) => p.id === x.row.outletId)?.nama)
        .filter(Boolean);
      throw new ApiError(
        `${names.join(", ")} diblokir karena kredit. ${diblokir[0].exp.alasan} Selesaikan tagihan atau naikkan plafon di data ${outletLabel()}.`,
      );
    }

    const total = rows.reduce((s, r) => s + r.jumlahUnit, 0);
    const sa = requireSa(db, plan.saId);
    const sisa = sa.totalKuota - sa.terpakai;
    if (total > sisa) {
      throw new ApiError(
        `Kuota ${sa.nomorSA} tidak mencukupi. Tersisa ${fmt(sisa)} ${unitLabel()}, rencana ini butuh ${fmt(total)}.`,
      );
    }

    // Check truck capacity per driver.
    const perDriver = new Map<ID, number>();
    for (const r of rows) {
      perDriver.set(r.driverId!, (perDriver.get(r.driverId!) ?? 0) + r.jumlahUnit);
    }
    for (const [driverId, muatan] of perDriver) {
      const driver = db.drivers.find((d) => d.id === driverId);
      if (driver && muatan > driver.kapasitas) {
        throw new ApiError(
          `Muatan ${driver.nama} ${fmt(muatan)} ${unitLabel()} melebihi kapasitas ${driver.armada} (${fmt(driver.kapasitas)}).`,
        );
      }
    }

    sa.terpakai += total;
    refreshSaStatus(sa);

    const actor = recordAudit(db, {
      action: "plan.confirm",
      entity: "DistributionPlan",
      entityId: plan.id,
      summary: `Mengonfirmasi ${plan.kode}: ${rows.length} surat jalan, ${fmt(total)} ${unitLabel()} dari ${sa.nomorSA}.`,
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
          outletId: row.outletId,
          driverId: row.driverId!,
          tanggal: plan.tanggal,
          jamRencana: row.jamPengiriman,
          lines: row.lines.map((l) => ({
            productId: l.productId,
            target: l.jumlah,
            realisasi: 0,
          })),
          target: row.jumlahUnit,
          realisasi: 0,
          status: "Antrian",
        });
      });

    notify(db, {
      type: "Sistem",
      title: `Rencana ${plan.kode} dikonfirmasi`,
      message: `${rows.length} surat jalan terbit, ${fmt(total)} ${unitLabel()} dialokasikan dari ${sa.nomorSA}.`,
      href: "/monitoring",
    });

    if (sa.status === "Limit") {
      notify(db, {
        type: "Alert",
        title: "Kuota SA hampir habis",
        message: `${sa.nomorSA} tersisa ${fmt(sa.totalKuota - sa.terpakai)} ${unitLabel()} setelah konfirmasi ini.`,
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

/* ── outlet orders ──────────────────────────────────────────────────── */

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
      summary: `${action === "approve" ? "Menyetujui" : "Menolak"} ${o.kode} (${fmt(o.jumlahUnit)} ${unitLabel()}).`,
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
        (r) => r.planId === planId && r.outletId === o.outletId,
      );
      if (existing) {
        for (const line of o.lines) {
          const same = existing.lines.find((l) => l.productId === line.productId);
          if (same) same.jumlah += line.jumlah;
          else existing.lines.push({ ...line });
        }
        existing.jumlahUnit = sumJumlah(existing.lines);
      } else {
        const count = db.planRows.filter((r) => r.planId === planId).length;
        db.planRows.push({
          id: nextId("row"),
          planId,
          outletId: o.outletId,
          driverId: null,
          lines: [...o.lines],
          jumlahUnit: o.jumlahUnit,
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

/** What the sopir records at the drop, beyond the status itself. */
export interface DeliveryReport {
  /** Empty cylinders collected. */
  unitKembali?: number;
  /** Who signed for the load. */
  diterimaOleh?: string;
  catatan?: string;
  /** Where the sopir was when they filed this, if the device could say. */
  posisi?: GeoStamp;
  /**
   * Per-product outcome, when whoever filed it knew the breakdown.
   *
   * The sopir always does — they unloaded it. The desk close does not, and
   * falls back to spreading the scalar total across the loaded lines.
   */
  lines?: { productId: ID; realisasi: number; kembali?: number }[];
}

export function updateDeliveryStatus(
  deliveryId: ID,
  status: DeliveryEntity["status"],
  realisasi?: number,
  report?: DeliveryReport,
) {
  return mutate((db) => {
    const d = db.deliveries.find((x) => x.id === deliveryId);
    if (!d) throw new ApiError("Surat jalan tidak ditemukan.", 404);

    // The surat jalan is the authority on what left the yard, so a drop cannot
    // report more than was loaded — that is a paperwork error, not a delivery.
    if (realisasi !== undefined) {
      if (realisasi < 0) throw new ApiError(`Jumlah ${unitLabel()} tidak boleh negatif.`);
      if (realisasi > d.target) {
        throw new ApiError(
          `${d.kode} hanya memuat ${fmt(d.target)} ${unitLabel()}, tidak bisa mencatat ${fmt(realisasi)} diterima.`,
        );
      }
    }
    if (report?.unitKembali != null && report.unitKembali < 0) {
      throw new ApiError(`Jumlah ${unitLabel()} kembali tidak boleh negatif.`);
    }

    d.status = status;

    if (report?.lines?.length) {
      // Filed per product: the authoritative case.
      const byProduct = new Map(report.lines.map((l) => [l.productId, l]));
      d.lines = d.lines.map((l) => {
        const filed = byProduct.get(l.productId);
        if (!filed) return l;
        return {
          ...l,
          realisasi: Math.min(l.target, Math.max(0, filed.realisasi)),
          kembali: filed.kembali,
        } satisfies DeliveryLine;
      });
      d.realisasi = sumRealisasi(d.lines);
      d.unitKembali = sumKembali(d.lines);
    } else if (realisasi !== undefined) {
      d.lines = applyScalarRealisasi(d.lines, realisasi);
      d.realisasi = realisasi;
    }

    if (report?.unitKembali != null) d.unitKembali = report.unitKembali;
    if (report?.diterimaOleh?.trim()) d.diterimaOleh = report.diterimaOleh.trim();
    if (report?.catatan?.trim()) d.catatan = report.catatan.trim();

    if (status === "Proses" && !d.mulaiPada) d.mulaiPada = new Date().toISOString();
    if (status === "Selesai") {
      d.selesaiPada = new Date().toISOString();
      if (realisasi === undefined && !report?.lines?.length && d.realisasi === 0) {
        d.lines = d.lines.map((l) => ({ ...l, realisasi: l.target }));
        d.realisasi = sumTarget(d.lines);
      }
      // The truck is at the outlet, so it is no longer somewhere on the road.
      d.driverLat = undefined;
      d.driverLng = undefined;
      raiseInvoice(db, d);
    }

    recordAudit(db, {
      action: "delivery.status",
      entity: "Delivery",
      entityId: d.id,
      summary: `${d.kode} → ${status}${realisasi !== undefined ? ` (${fmt(realisasi)} ${unitLabel()})` : ""}.`,
    });

    if (report?.posisi) recordDeliveryEvent(db, d, status, report.posisi, report.catatan);

    // The board reads driver status, so a drop moved by hand has to update it
    // too — otherwise a truck the sopir just despatched still shows Standby.
    refreshDriverStatus(db, d.driverId);

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

const EVENT_TYPE: Partial<Record<DeliveryEntity["status"], DeliveryEventType>> = {
  Proses: "berangkat",
  Selesai: "selesai",
  Tertunda: "tertunda",
};

/**
 * Appends what the sopir filed, and where from.
 *
 * The distance is computed here, once, against the outlet's coordinates as they
 * stand at the moment of filing — see the note on DeliveryEventEntity.
 */
function recordDeliveryEvent(
  db: Database,
  d: DeliveryEntity,
  status: DeliveryEntity["status"],
  posisi: GeoStamp,
  catatan?: string,
) {
  const tipe = EVENT_TYPE[status];
  if (!tipe) return;

  const pkl = db.outlets.find((p) => p.id === d.outletId);
  const jarakMeter =
    posisi.status === "ok" && posisi.lat != null && posisi.lng != null && pkl
      ? distanceMeters({ lat: posisi.lat, lng: posisi.lng }, { lat: pkl.lat, lng: pkl.lng })
      : undefined;

  const event: DeliveryEventEntity = {
    // Follows the delivery, not the active scope: the event belongs where the
    // goods went, exactly as its invoice does.
    tenantId: d.tenantId,
    branchId: d.branchId,
    id: nextId("evt"),
    deliveryId: d.id,
    driverId: d.driverId,
    tipe,
    at: posisi.at,
    aktor: currentActor(),
    posisi,
    jarakMeter,
    catatan,
  };
  db.deliveryEvents.unshift(event);
  if (db.deliveryEvents.length > 2000) db.deliveryEvents.length = 2000;

  // A real fix is better than the simulated position the ops clock invents, so
  // it takes over as the truck's last known whereabouts while the run is live.
  if (posisi.status === "ok" && status !== "Selesai") {
    d.driverLat = posisi.lat;
    d.driverLng = posisi.lng;
  }
  return event;
}

/**
 * Recomputes one driver's runtime status from today's surat jalan.
 *
 * Status is derived, never set directly: two screens and a timer all move
 * deliveries, and any of them setting the driver by hand would drift.
 */
function refreshDriverStatus(db: Database, driverId: ID) {
  const driver = db.drivers.find((x) => x.id === driverId);
  if (!driver || driver.status === "Cuti") return;

  const today = isoDate(startOfToday());
  const mine = db.deliveries.filter(
    (x) => x.tanggal === today && x.driverId === driverId,
  );
  if (mine.length === 0) return;

  if (mine.some((x) => x.status === "Proses")) {
    // Keep whichever of the two running states it already had; they differ only
    // in what the truck is doing at the stop, which only the sopir knows.
    if (driver.status !== "Dalam Perjalanan" && driver.status !== "Bongkar Muat") {
      driver.status = "Dalam Perjalanan";
    }
  } else if (mine.every((x) => x.status === "Selesai" || x.status === "Tertunda")) {
    driver.status = "Selesai";
  } else {
    driver.status = "Standby";
  }
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
    const pkl = db.outlets.find((x) => x.id === p.outletId);

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
        message: `${p.nomor} dari ${pkl?.nama ?? "${outletLabel()}"} ditolak: ${p.keterangan}`,
        href: "/payments",
        rule: "paymentPending",
      });
    }
    return p;
  });
}

/** Records cash received, optionally applying it to invoices in one step. */
export function createPayment(input: {
  outletId: ID;
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
  outletId: ID;
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
): ReceiptEntity {
  return mutate((db) => {
    const r = db.receipts.find((x) => x.id === receiptId);
    if (!r) throw new ApiError("Kwitansi tidak ditemukan.", 404);
    if (r.status !== "Menunggu Review") {
      throw new ApiError(`${r.nomorKwitansi} sudah ditinjau.`);
    }
    Object.assign(r, edits);
    if (!r.outletId) {
      throw new ApiError(`Pilih ${outletLabel()} sebelum memvalidasi kwitansi.`);
    }
    if (r.lines.length === 0) {
      throw new ApiError("Kwitansi belum punya rincian barang.");
    }

    // Every line must name a real product. Billing an unmatched line against a
    // default would put the wrong item at the wrong price on a real invoice.
    const belumDikenali = r.lines.filter((l) => !l.productId);
    if (belumDikenali.length > 0) {
      throw new ApiError(
        `${belumDikenali.length} baris belum dicocokkan ke produk: ${belumDikenali
          .map((l) => l.namaTerbaca || "tanpa nama")
          .join(", ")}.`,
      );
    }
    if (r.lines.some((l) => l.jumlah <= 0 || l.hargaSatuan <= 0)) {
      throw new ApiError("Jumlah dan harga setiap baris harus lebih dari nol.");
    }
    if (r.nominal <= 0) throw new ApiError("Nominal kwitansi harus lebih dari nol.");

    // The printed total and the items are read independently. If they disagree,
    // one of them was misread, and neither is safe to bill from until a human
    // says which.
    const dariRincian = r.lines.reduce((sum, l) => sum + l.jumlah * l.hargaSatuan, 0);
    if (Math.abs(dariRincian - r.nominal) > 1) {
      throw new ApiError(
        `Rincian berjumlah Rp ${fmt(dariRincian)} tetapi kwitansi tertulis Rp ${fmt(
          r.nominal,
        )}. Perbaiki salah satunya sebelum memvalidasi.`,
      );
    }

    r.jumlahUnit = r.lines.reduce((sum, l) => sum + l.jumlah, 0);

    r.status = "Tervalidasi";
    r.ditinjauPada = new Date().toISOString();

    // A validated scan is a billable event, so it raises a proper invoice.
    const pkl = db.outlets.find((p) => p.id === r.outletId);
    const seq = db.invoices.length + 1;
    const invoice: InvoiceEntity = {
      // Falls back to the ACTING tenant, not to "the" tenant: with a hierarchy there
    // is no single one, and stamping a row with the root's id while acting as a
    // subsidiary is a cross-tenant write the backend's WITH CHECK would refuse.
    tenantId: pkl?.tenantId ?? getActiveScope().actingTenantId,
      branchId: pkl?.branchId ?? db.branches[0]?.id ?? "",
      id: nextId("inv"),
      nomor: docNumber(db, "invoice", r.tanggalKwitansi, seq),
      outletId: r.outletId,
      deliveryId: null,
      tanggal: r.tanggalKwitansi,
      jatuhTempo: addDaysIso(r.tanggalKwitansi, pkl?.termin ?? 0),
      // Billed from the receipt's own items, at the prices the paper states
      // rather than today's catalogue — the invoice has to match the document
      // the customer is holding.
      lines: r.lines.map((l) => {
        const prod = productOf(db.products, l.productId!);
        return {
          productId: l.productId!,
          nama: prod?.nama ?? l.namaTerbaca,
          satuan: prod?.satuan ?? "unit",
          jumlah: l.jumlah,
          hargaSatuan: l.hargaSatuan,
          subtotal: l.jumlah * l.hargaSatuan,
        };
      }),
      jumlahUnit: r.jumlahUnit,
      hargaSatuan: r.jumlahUnit > 0 ? Math.round(r.nominal / r.jumlahUnit) : 0,
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

export function saveOutlet(
  input: Partial<OutletEntity> & { id?: ID },
): OutletEntity {
  return mutate((db) => {
    if (!input.nama?.trim()) throw new ApiError(`Nama ${outletLabel()} wajib diisi.`);

    if (input.id) {
      const existing = db.outlets.find((p) => p.id === input.id);
      if (!existing) throw new ApiError(`${outletLabelTitle()} tidak ditemukan.`, 404);
      Object.assign(existing, input);
      recordAudit(db, {
        action: "outlet.update",
        entity: outletLabelTitle(),
        entityId: existing.id,
        summary: `Memperbarui data ${existing.nama}.`,
      });
      return existing;
    }

    const seq = db.outlets.length + 1;
    const created: OutletEntity = {
      ...stampScope({}),
      id: nextId("pkl"),
      kode: input.kode?.trim() || `PKL-${String(seq).padStart(4, "0")}`,
      nama: input.nama.trim(),
      alamat: input.alamat ?? "",
      kecamatan: input.kecamatan ?? "",
      kota: input.kota ?? "Kota Salatiga",
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
    if (db.outlets.some((p) => p.kode === created.kode)) {
      throw new ApiError(`Kode ${created.kode} sudah dipakai ${outletLabel()} lain.`, 409);
    }
    db.outlets.unshift(created);
    recordAudit(db, {
      action: "outlet.create",
      entity: outletLabelTitle(),
      entityId: created.id,
      summary: `Mendaftarkan ${outletLabel()} ${created.nama} (${created.kode}).`,
    });
    return created;
  });
}

export function deleteOutlet(id: ID) {
  return mutate((db) => {
    const pkl = db.outlets.find((p) => p.id === id);
    if (!pkl) throw new ApiError(`${outletLabelTitle()} tidak ditemukan.`, 404);
    const open = db.deliveries.some(
      (d) => d.outletId === id && d.status !== "Selesai",
    );
    if (open) {
      throw new ApiError(
        `${pkl.nama} masih punya surat jalan berjalan. Selesaikan pengiriman sebelum menghapus.`,
      );
    }
    db.outlets = db.outlets.filter((p) => p.id !== id);
    recordAudit(db, {
      action: "outlet.delete",
      entity: outletLabelTitle(),
      entityId: id,
      summary: `Menghapus ${outletLabel()} ${pkl.nama}.`,
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
      driverId: input.driverId,
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
      satuan: input.satuan?.trim() || "unit",
      returnable: input.returnable ?? false,
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
    // Written to the ACTING tenant's own row, never to db.settings.
    //
    // db.settings is derived — the acting tenant's values resolved up the tree
    // — so assigning to it would look like it worked and be discarded on the
    // next getDb(). Worse, if it did persist, every inherited value the form
    // rendered would become an override this tenant never chose, and its parent
    // could not change it for them again. Writing only the patch keeps
    // "inherited" and "set here" distinguishable.
    const tenantId = getActiveScope().actingTenantId;
    const own = db.settingsByTenant.find((r) => r.tenantId === tenantId);
    if (own) {
      own.values = { ...own.values, ...patch };
    } else {
      db.settingsByTenant.push({ tenantId, values: { ...patch } });
    }
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
        const pkl = db.outlets.find((p) => p.id === d.outletId);
        if (pkl) {
          d.driverLat = pkl.lat + (Math.random() - 0.5) * 0.03;
          d.driverLng = pkl.lng + (Math.random() - 0.5) * 0.03;
        }
        changed = true;
      } else if (d.status === "Proses") {
        const step = Math.ceil(d.target * (0.08 + Math.random() * 0.12));
        d.realisasi = Math.min(d.target, d.realisasi + step);
        // Lines are what the invoice is priced from, so simulated progress has
        // to move them too. Advancing only the headline total would leave a
        // clock-completed drop invoicing against stale line quantities.
        d.lines = applyScalarRealisasi(d.lines, d.realisasi);
        const pkl = db.outlets.find((p) => p.id === d.outletId);
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
      for (const driver of db.drivers) refreshDriverStatus(db, driver.id);
    }

    return changed;
  });
}

/**
 * Removes a tenant's override so the field inherits again.
 *
 * Deletes the key rather than writing null or an empty string. An absent key is
 * what "not set here, ask my parent" means in this shape — a null would be a
 * value the tenant had chosen, and "" would pin an empty lexicon term that the
 * parent could never correct.
 */
export function clearOverride(field: keyof Database["settings"]) {
  return mutate((db) => {
    const tenantId = getActiveScope().actingTenantId;
    const own = db.settingsByTenant.find((r) => r.tenantId === tenantId);
    if (own) delete own.values[field];

    recordAudit(db, {
      action: "settings.inherit",
      entity: "Settings",
      entityId: String(field),
      summary: `Mengembalikan "${String(field)}" ke pengaturan induk.`,
    });
    // Re-resolved on the next getDb(), so the caller sees the parent's value.
    return db.settingsByTenant;
  });
}
