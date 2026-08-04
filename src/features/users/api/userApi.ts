import { getDb, latency } from "@/mocks/db";
import { deleteUser, saveUser } from "@/mocks/rules";
import { exportCsv, timestampSuffix } from "@/lib/export";
import type { UserEntity, UserStatusEntity } from "@/mocks/types";

/** What each role may do, shown on the access page so it is not a mystery. */
export const ROLE_SUMMARY: Record<UserEntity["role"], string> = {
  admin: "Akses penuh, termasuk pengaturan sistem dan manajemen pengguna.",
  manager: "Menyetujui pesanan, mengonfirmasi rencana, dan membaca semua laporan.",
  finance: "Memverifikasi pembayaran, meninjau kwitansi, dan mengunduh laporan keuangan.",
  staff: "Menyusun rencana distribusi dan memperbarui status pengiriman.",
  viewer: "Hanya membaca. Tidak dapat mengubah data apa pun.",
};

export const ROLE_LABEL: Record<UserEntity["role"], string> = {
  admin: "Admin",
  manager: "Manajer",
  finance: "Keuangan",
  staff: "Staf Operasional",
  viewer: "Peninjau",
};

export async function getUsers(filters?: {
  search?: string;
  role?: UserEntity["role"] | "Semua";
  status?: UserStatusEntity | "Semua";
}): Promise<UserEntity[]> {
  await latency("read");
  return getDb()
    .users.filter((u) => {
      if (filters?.role && filters.role !== "Semua" && u.role !== filters.role) return false;
      if (filters?.status && filters.status !== "Semua" && u.status !== filters.status)
        return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          u.nama.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.cabang.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function createOrUpdateUser(input: Partial<UserEntity> & { id?: string }) {
  await latency("write");
  return saveUser(input);
}

export async function removeUser(id: string) {
  await latency("write");
  deleteUser(id);
}

export async function exportUsers() {
  await latency("read");
  const rows = await getUsers();
  exportCsv(
    `pengguna-${timestampSuffix()}`,
    ["Nama", "Email", "Peran", "Telepon", "Cabang", "Status", "Terakhir Masuk"],
    rows.map((u) => [
      u.nama,
      u.email,
      ROLE_LABEL[u.role],
      u.telepon,
      u.cabang,
      u.status,
      u.terakhirMasuk ? new Date(u.terakhirMasuk).toLocaleString("id-ID") : "Belum pernah",
    ]),
  );
  return rows.length;
}

/** Audit trail, filtered to one actor or entity when asked. */
export async function getAuditTrail(filters?: {
  actor?: string;
  entity?: string;
  limit?: number;
}) {
  await latency("read");
  return getDb()
    .audit.filter((a) => {
      if (filters?.actor && a.actor !== filters.actor) return false;
      if (filters?.entity && a.entity !== filters.entity) return false;
      return true;
    })
    .slice(0, filters?.limit ?? 100);
}
