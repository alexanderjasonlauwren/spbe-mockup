import { scopedDb } from "@/mocks/scope";
import { latency, mutate, nextId, recordAudit } from "@/mocks/db";
import { decideOrder, scheduleOrders } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import { isoDate, startOfToday } from "@/mocks/seed";
import { defaultProduct, sumJumlah } from "@/mocks/lines";
import type { OrderEntity, OrderStatus } from "@/mocks/types";
import { outletLabelTitle, unitLabel, unitLabelTitle } from "@/lib/lexicon";

export interface OrderView extends OrderEntity {
  outlet: string;
  kecamatan: string;
  /** Cylinders this outlet may still take this month. */
  sisaKuotaOutlet: number;
  /** Set once the order has been pulled onto a plan. */
  kodeRencana?: string;
}

function toView(o: OrderEntity): OrderView {
  const db = scopedDb();
  const pkl = db.outlets.find((p) => p.id === o.outletId);
  const from = isoDate(new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1));
  const terpakai = db.deliveries
    .filter((d) => d.outletId === o.outletId && d.tanggal >= from)
    .reduce((s, d) => s + d.target, 0);

  return {
    ...o,
    outlet: pkl?.nama ?? "—",
    kecamatan: pkl?.kecamatan ?? "—",
    sisaKuotaOutlet: Math.max(0, (pkl?.kuotaBulanan ?? 0) - terpakai),
    kodeRencana: db.plans.find((p) => p.id === o.planId)?.kode,
  };
}

export async function getOrders(filters?: {
  status?: OrderStatus | "Semua";
  search?: string;
}): Promise<OrderView[]> {
  await latency("read");
  return scopedDb()
    .orders.map(toView)
    .filter((o) => {
      if (filters?.status && filters.status !== "Semua" && o.status !== filters.status)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          o.kode.toLowerCase().includes(q) || o.outlet.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.tanggalMasuk.localeCompare(a.tanggalMasuk));
}

export async function getOrderTotals() {
  await latency("read");
  const all = scopedDb().orders;
  const count = (s: OrderStatus) => all.filter((o) => o.status === s).length;
  return {
    baru: count("Baru"),
    baruUnit: all
      .filter((o) => o.status === "Baru")
      .reduce((s, o) => s + o.jumlahUnit, 0),
    disetujui: count("Disetujui"),
    disetujuiUnit: all
      .filter((o) => o.status === "Disetujui")
      .reduce((s, o) => s + o.jumlahUnit, 0),
    dijadwalkan: count("Dijadwalkan"),
    selesai: count("Selesai"),
    ditolak: count("Ditolak"),
  };
}

export async function approveOrder(id: string, catatan?: string) {
  await latency("write");
  return toView(decideOrder(id, "approve", catatan));
}

export async function declineOrder(id: string, alasan: string) {
  await latency("write");
  return toView(decideOrder(id, "reject", alasan));
}

export async function approveOrderBatch(ids: string[]) {
  await latency("write");
  const failures: string[] = [];
  let approved = 0;
  for (const id of ids) {
    try {
      decideOrder(id, "approve");
      approved += 1;
    } catch (error) {
      failures.push((error as Error).message);
    }
  }
  return { approved, failures };
}

export async function addOrdersToPlan(planId: string, orderIds: string[]) {
  await latency("write");
  return scheduleOrders(planId, orderIds);
}

/** Records an order phoned or messaged in by an outlet. */
export async function createOrder(input: {
  outletId: string;
  jumlahUnit: number;
  tanggalDiminta: string;
  catatan?: string;
  /** Omitted by the quick-entry form, which orders the catalogue staple. */
  lines?: { productId: string; jumlah: number }[];
}) {
  await latency("write");
  if (input.jumlahUnit <= 0) throw new Error(`Jumlah ${unitLabel()} harus lebih dari nol.`);

  return mutate((db) => {
    const seq = db.orders.length + 1;
    const pkl = db.outlets.find((p) => p.id === input.outletId);
    const lines = input.lines?.length
      ? input.lines
      : [{ productId: defaultProduct(db.products)?.id ?? "", jumlah: input.jumlahUnit }];
    const order: OrderEntity = {
      tenantId: pkl?.tenantId ?? db.tenant.id,
      branchId: pkl?.branchId ?? db.branches[0]?.id ?? "",
      id: nextId("ord"),
      kode: [
        db.settings.penomoran.pesanan,
        ...(db.settings.penomoran.sertakanTanggal
          ? [isoDate(startOfToday()).replace(/-/g, "")]
          : []),
        String(seq).padStart(3, "0"),
      ].join("-"),
      outletId: input.outletId,
      lines,
      jumlahUnit: sumJumlah(lines),
      tanggalMasuk: new Date().toISOString(),
      tanggalDiminta: input.tanggalDiminta,
      status: "Baru",
      catatan: input.catatan,
    };
    db.orders.unshift(order);
    recordAudit(db, {
      action: "order.create",
      entity: "Order",
      entityId: order.id,
      summary: `Mencatat pesanan ${order.kode} sebanyak ${order.jumlahUnit.toLocaleString("id-ID")} ${unitLabel()}.`,
    });
    return toView(order);
  });
}

/** Draft plans an approved order can be added to. */
export async function getSchedulablePlans() {
  await latency("read");
  return scopedDb()
    .plans.filter((p) => p.status === "Draft" && p.tanggal >= isoDate(startOfToday()))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .map((p) => ({ id: p.id, kode: p.kode, tanggal: p.tanggal }));
}

export async function exportOrders(status?: OrderStatus | "Semua") {
  await latency("read");
  const rows = await getOrders({ status });
  exportCsv(
    `pesanan-${timestampSuffix()}`,
    [
      "Kode",
      outletLabelTitle(),
      "Kecamatan",
      `${unitLabelTitle()}`,
      "Masuk",
      "Diminta",
      "Status",
      "Rencana",
      "Catatan",
    ],
    rows.map((o) => [
      o.kode,
      o.outlet,
      o.kecamatan,
      o.jumlahUnit,
      new Date(o.tanggalMasuk).toLocaleString("id-ID"),
      new Date(o.tanggalDiminta).toLocaleDateString("id-ID"),
      o.status,
      o.kodeRencana ?? "",
      o.catatan ?? "",
    ]),
  );
  return rows.length;
}
