/**
 * The fleet against the browser store.
 *
 * The demo build's implementation. `core.vehicles` had no console counterpart
 * before this, so the store gained a `vehicles` collection with it — see
 * `mocks/seed.ts` and `mocks/fleet.ts` for why the pairing with a driver is a
 * function rather than a column.
 */
import { latency } from "@/mocks/db";
import { scopedDb } from "@/mocks/scope";
import { deleteVehicle, saveVehicle } from "@/mocks/rules";
import type { VehicleEntity } from "@/mocks/types";
import type { VehicleApi, VehicleFilters, VehicleView } from "./contract";

/** Thirty days, which is the notice a workshop booking actually needs. */
const SOON_MS = 30 * 24 * 60 * 60 * 1000;

export function toView(v: VehicleEntity, stnk?: string, kir?: string): VehicleView {
  const lapsing = (iso?: string) =>
    !!iso && new Date(iso).getTime() - Date.now() < SOON_MS;
  return {
    ...v,
    stnkBerakhir: stnk,
    kirBerakhir: kir,
    perluPerhatian: lapsing(stnk) || lapsing(kir),
  };
}

async function getVehicles(filters?: VehicleFilters): Promise<VehicleView[]> {
  await latency("read");
  return scopedDb()
    .vehicles.map((v) => toView(v))
    .filter((v) => {
      if (filters?.status && filters.status !== "Semua" && v.status !== filters.status)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return v.plat.toLowerCase().includes(q) || v.armada.toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => a.plat.localeCompare(b.plat));
}

async function getVehicleDetail(id: string): Promise<VehicleView> {
  await latency("read");
  const v = scopedDb().vehicles.find((x) => x.id === id);
  if (!v) throw new Error("Armada tidak ditemukan.");
  return toView(v);
}

async function createOrUpdateVehicle(
  input: Partial<VehicleEntity> & { id?: string },
): Promise<VehicleView> {
  await latency("write");
  return toView(saveVehicle(input));
}

async function removeVehicle(id: string): Promise<void> {
  await latency("write");
  deleteVehicle(id);
}

export const vehicleApiMock: VehicleApi = {
  getVehicles,
  getVehicleDetail,
  createOrUpdateVehicle,
  removeVehicle,
};
