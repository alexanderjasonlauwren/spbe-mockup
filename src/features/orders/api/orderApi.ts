import { scopedDb } from "@/mocks/scope";
import { latency, mutate, nextId, recordAudit } from "@/mocks/db";
import { decideOrder, scheduleOrders } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import { isoDate, startOfToday } from "@/mocks/seed";
import type { OrderEntity, OrderStatus } from "@/mocks/types";

export interface OrderView extends OrderEntity {
  pangkalan: string;
  kecamatan: string;
  /** Cylinders this outlet may still take this month. */
  sisaKuotaPangkalan: number;
  /** Set once the order has been pulled onto a plan. */
  kodeRencana?: string;
}

function toView(o: OrderEntity): OrderView {
  const db = scopedDb();
  const pkl = db.pangkalan.find((p) => p.id === o.pangkalanId);
  const from = isoDate(new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1));
  const terpakai = db.deliveries
    .filter((d) => d.pangkalanId === o.pangkalanId && d.tanggal >= from)
    .reduce((s, d) => s + d.target, 0);

  return {
    ...o,
    pangkalan: pkl?.nama ?? "—",
    kecamatan: pkl?.kecamatan ?? "—",
    sisaKuotaPangkalan: Math.max(0, (pkl?.kuotaBulanan ?? 0) - terpakai),
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
          o.kode.toLowerCase().includes(q) || o.pangkalan.toLowerCase().includes(q)
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
    baruTabung: all
      .filter((o) => o.status === "Baru")
      .reduce((s, o) => s + o.jumlahTabung, 0),
    disetujui: count("Disetujui"),
    disetujuiTabung: all
      .filter((o) => o.status === "Disetujui")
      .reduce((s, o) => s + o.jumlahTabung, 0),
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
  pangkalanId: string;
  jumlahTabung: number;
  tanggalDiminta: string;
  catatan?: string;
}) {
  await latency("write");
  if (input.jumlahTabung <= 0) throw new Error("Jumlah tabung harus lebih dari nol.");

  return mutate((db) => {
    const seq = db.orders.length + 1;
    const pkl = db.pangkalan.find((p) => p.id === input.pangkalanId);
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
      pangkalanId: input.pangkalanId,
      jumlahTabung: input.jumlahTabung,
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
      summary: `Mencatat pesanan ${order.kode} sebanyak ${order.jumlahTabung.toLocaleString("id-ID")} tabung.`,
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
      "Pangkalan",
      "Kecamatan",
      "Tabung",
      "Masuk",
      "Diminta",
      "Status",
      "Rencana",
      "Catatan",
    ],
    rows.map((o) => [
      o.kode,
      o.pangkalan,
      o.kecamatan,
      o.jumlahTabung,
      new Date(o.tanggalMasuk).toLocaleString("id-ID"),
      new Date(o.tanggalDiminta).toLocaleDateString("id-ID"),
      o.status,
      o.kodeRencana ?? "",
      o.catatan ?? "",
    ]),
  );
  return rows.length;
}
