import { scopedDb } from "@/mocks/scope";
import { latency } from "@/mocks/db";
import {
  cancelPlan,
  confirmPlan as confirmPlanRule,
  createPlan as createPlanRule,
  savePlanRows,
  scheduleOrders,
} from "@/mocks/rules";
import { printDocument } from "@/lib/export";
import { outletExposure } from "@/mocks/ar";
import { defaultProduct } from "@/mocks/lines";
import { isoDate, startOfToday } from "@/mocks/seed";
import type { PlanEntity } from "@/mocks/types";
import type {
  DistributionPlan,
  DriverOption,
  PlanOption,
  PlanRow,
} from "../types";
import { outletLabelTitle, unitLabel, unitLabelTitle } from "@/lib/lexicon";

function toPlanView(plan: PlanEntity): DistributionPlan {
  const db = scopedDb();
  const rows = db.planRows.filter((r) => r.planId === plan.id);
  const sa = db.scheduleAgreements.find((s) => s.id === plan.saId);

  return {
    id: plan.id,
    kode: plan.kode,
    tanggal: plan.tanggal,
    totalUnit: rows.reduce((s, r) => s + r.jumlahUnit, 0),
    jumlahOutlet: rows.length,
    jumlahDriver: new Set(rows.map((r) => r.driverId).filter(Boolean)).size,
    status: plan.status,
    saId: plan.saId,
    nomorSA: sa?.nomorSA ?? "—",
    sisaKuotaSA: sa ? Math.max(0, sa.totalKuota - sa.terpakai) : 0,
    catatan: plan.catatan,
    dibuatOleh: plan.dibuatOleh,
    dikonfirmasiOleh: plan.dikonfirmasiOleh,
    dikonfirmasiPada: plan.dikonfirmasiPada,
  };
}

export async function getPlanList(): Promise<DistributionPlan[]> {
  await latency("read");
  return scopedDb()
    .plans.slice()
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal))
    .map(toPlanView);
}

export async function getPlanDetail(planId: string): Promise<PlanRow[]> {
  await latency("read");
  const db = scopedDb();
  const monthStart = isoDate(
    new Date(startOfToday().getFullYear(), startOfToday().getMonth(), 1),
  );

  return db.planRows
    .filter((r) => r.planId === planId)
    .sort((a, b) => a.jamPengiriman.localeCompare(b.jamPengiriman))
    .map((r) => {
      const pkl = db.outlets.find((p) => p.id === r.outletId);
      const driver = db.drivers.find((d) => d.id === r.driverId);
      const takenThisMonth = db.deliveries
        .filter((d) => d.outletId === r.outletId && d.tanggal >= monthStart)
        .reduce((s, d) => s + d.target, 0);
      // Credit standing, not "is there an unverified transfer" — this column
      // is what tells the planner a stop is about to be refused.
      const exp = outletExposure(db, r.outletId);

      return {
        id: r.id,
        outletId: r.outletId,
        outlet: pkl?.nama ?? "—",
        alamat: pkl ? `${pkl.alamat}, Kec. ${pkl.kecamatan}` : "—",
        lines: r.lines.map((l) => ({ ...l })),
        jumlahUnit: r.jumlahUnit,
        driverId: r.driverId,
        driver: driver?.nama ?? "Belum ditetapkan",
        jamPengiriman: r.jamPengiriman,
        statusBayar: exp.terblokir ? "Belum Lunas" : "Lunas",
        sisaKuotaOutlet: Math.max(0, (pkl?.kuotaBulanan ?? 0) - takenThisMonth),
        piutang: exp.outstanding,
        piutangJatuhTempo: exp.jatuhTempo,
        alasanBlokir: exp.alasan,
      } satisfies PlanRow;
    });
}

export async function saveDraft(planId: string, rows: PlanRow[]): Promise<void> {
  await latency("write");
  savePlanRows(
    planId,
    rows.map((r) => ({
      id: r.id,
      outletId: r.outletId,
      driverId: r.driverId,
      // A row edited on a screen that still only knows totals keeps its mix and
      // pushes the change onto the first line, rather than dropping the rest.
      lines: r.lines.filter((l) => l.productId && l.jumlah > 0),
      // Recomputed by the rules layer from the lines; sent only so the shape
      // matches the entity.
      jumlahUnit: r.jumlahUnit,
      jamPengiriman: r.jamPengiriman,
    })),
  );
}

export async function confirmPlan(planId: string) {
  await latency("write");
  return confirmPlanRule(planId);
}

export async function createPlan(input: { tanggal: string; saId: string }) {
  await latency("write");
  return toPlanView(createPlanRule(input));
}

export async function cancelDistributionPlan(planId: string): Promise<void> {
  await latency("write");
  cancelPlan(planId);
}

export async function addApprovedOrders(planId: string, orderIds: string[]) {
  await latency("write");
  return scheduleOrders(planId, orderIds);
}

/* ── option lists for the planner ──────────────────────────────────────── */

export async function getOutletOptions(): Promise<PlanOption[]> {
  await latency("read");
  return scopedDb()
    .outlets.filter((p) => p.status === "Aktif")
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .map((p) => ({
      id: p.id,
      label: p.nama,
      sublabel: `Kec. ${p.kecamatan} · kuota ${p.kuotaBulanan.toLocaleString("id-ID")}/bln`,
    }));
}

/** What a stop can be loaded with. */
export async function getProductOptions(): Promise<
  { id: string; label: string; satuan: string }[]
> {
  await latency("read");
  return scopedDb()
    .products.filter((p) => p.aktif)
    .map((p) => ({ id: p.id, label: p.nama, satuan: p.satuan }));
}

/** The line a brand-new stop starts with, so a row is never empty. */
export async function getDefaultProductId(): Promise<string> {
  return defaultProduct(scopedDb().products)?.id ?? "";
}

export async function getDriverOptions(planId: string): Promise<DriverOption[]> {
  await latency("read");
  const db = scopedDb();
  const rows = db.planRows.filter((r) => r.planId === planId);

  return db.drivers.map((d) => ({
    id: d.id,
    label: d.nama,
    sublabel: `${d.plat} · ${d.armada}`,
    kapasitas: d.kapasitas,
    muatan: rows
      .filter((r) => r.driverId === d.id)
      .reduce((s, r) => s + r.jumlahUnit, 0),
    status: d.status,
    disabled: d.status === "Cuti",
  }));
}

export async function getActiveSaOptions(): Promise<PlanOption[]> {
  await latency("read");
  const today = isoDate(startOfToday());
  return scopedDb()
    .scheduleAgreements.filter(
      (s) => s.status !== "Draft" && s.periodeBerakhir >= today,
    )
    .map((s) => ({
      id: s.id,
      label: s.nomorSA,
      sublabel: `${s.supplier} · sisa ${(s.totalKuota - s.terpakai).toLocaleString("id-ID")} ${unitLabel()}`,
      disabled: s.terpakai >= s.totalKuota,
    }));
}

/** Prints the route sheet handed to drivers at the depot. */
export async function printRouteSheet(planId: string): Promise<void> {
  await latency("read");
  const db = scopedDb();
  const plan = db.plans.find((p) => p.id === planId);
  if (!plan) throw new Error("Rencana distribusi tidak ditemukan.");

  const rows = db.planRows
    .filter((r) => r.planId === planId)
    .sort((a, b) => a.jamPengiriman.localeCompare(b.jamPengiriman));
  const total = rows.reduce((s, r) => s + r.jumlahUnit, 0);
  const fmt = (n: number) => n.toLocaleString("id-ID");

  printDocument(
    `${plan.kode} — Lembar Rute`,
    `
    <p class="eyebrow">${db.settings.namaPerusahaan} · Agen ${db.settings.nomorAgen}</p>
    <h1>Lembar Rute Distribusi</h1>
    <hr class="rule" />
    <div class="meta">
      <div>Kode rencana<strong class="code">${plan.kode}</strong></div>
      <div>Tanggal<strong>${new Date(plan.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</strong></div>
      <div>Status<strong>${plan.status}</strong></div>
      <div>Titik singgah<strong>${rows.length}</strong></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Jam</th><th>${outletLabelTitle()}</th><th>Alamat</th><th>Driver / Armada</th>
          <th style="text-align:right">${unitLabelTitle()}</th><th style="width:90px">Diterima</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((r) => {
            const pkl = db.outlets.find((p) => p.id === r.outletId);
            const drv = db.drivers.find((d) => d.id === r.driverId);
            return `<tr>
              <td class="code">${r.jamPengiriman}</td>
              <td>${pkl?.nama ?? "—"}</td>
              <td>${pkl ? `${pkl.alamat}, Kec. ${pkl.kecamatan}` : "—"}</td>
              <td>${drv ? `${drv.nama}<br /><span class="code">${drv.plat}</span>` : "Belum ditetapkan"}</td>
              <td class="num">${fmt(r.jumlahUnit)}</td>
              <td></td>
            </tr>`;
          })
          .join("")}
      </tbody>
      <tfoot><tr><td colspan="4">Total muatan</td><td class="num">${fmt(total)}</td><td></td></tr></tfoot>
    </table>
    <div class="sign">
      <div>Petugas gudang<span></span></div>
      <div>Koordinator distribusi<span>${plan.dikonfirmasiOleh ?? ""}</span></div>
    </div>`,
  );
}
