import { scopedDb } from "@/mocks/scope";
import { ApiError, latency, mutate, nextId, recordAudit } from "@/mocks/db";
import type { NumberingEntity, OperationsEntity, SupplierEntity } from "@/mocks/types";
import { supplierLabel } from "@/lib/lexicon";

/* ── supply sources ────────────────────────────────────────────────────── */

export interface SupplierView extends SupplierEntity {
  /** Agreements issued by this supplier, so it is clear what deleting would orphan. */
  jumlahSA: number;
  kuotaAktif: number;
}

export async function getSupplierList(): Promise<SupplierView[]> {
  await latency("read");
  const db = scopedDb();
  return db.suppliers
    .map((s) => {
      const sas = db.scheduleAgreements.filter((x) => x.supplier === s.nama);
      return {
        ...s,
        jumlahSA: sas.length,
        kuotaAktif: sas
          .filter((x) => x.status === "Aktif" || x.status === "Limit")
          .reduce((sum, x) => sum + (x.totalKuota - x.terpakai), 0),
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama));
}

export async function saveSupplier(input: Partial<SupplierEntity> & { id?: string }) {
  await latency("write");
  return mutate((db) => {
    if (!input.nama?.trim()) throw new ApiError(`Nama ${supplierLabel()} wajib diisi.`);
    const clash = db.suppliers.find(
      (s) => s.nama.toLowerCase() === input.nama!.trim().toLowerCase() && s.id !== input.id,
    );
    if (clash) throw new ApiError(`${input.nama} sudah terdaftar.`, 409);

    if (input.id) {
      const existing = db.suppliers.find((s) => s.id === input.id);
      if (!existing) throw new ApiError(`${supplierLabel()} tidak ditemukan.`, 404);
      const namaLama = existing.nama;
      Object.assign(existing, input);
      // Agreements reference the supplier by name, so a rename has to follow through.
      if (namaLama !== existing.nama) {
        db.scheduleAgreements
          .filter((sa) => sa.supplier === namaLama)
          .forEach((sa) => (sa.supplier = existing.nama));
      }
      recordAudit(db, {
        action: "supplier.update",
        entity: "Supplier",
        entityId: existing.id,
        summary: `Memperbarui ${supplierLabel()} ${existing.nama}.`,
      });
      return existing;
    }

    const created: SupplierEntity = {
      id: nextId("supplier"),
      kode: input.kode?.trim() || `${supplierLabel()}-${String(db.suppliers.length + 1).padStart(3, "0")}`,
      nama: input.nama.trim(),
      alamat: input.alamat ?? "",
      penanggungJawab: input.penanggungJawab ?? "",
      telepon: input.telepon ?? "",
      aktif: input.aktif ?? true,
    };
    db.suppliers.unshift(created);
    recordAudit(db, {
      action: "supplier.create",
      entity: "Supplier",
      entityId: created.id,
      summary: `Menambahkan ${supplierLabel()} ${created.nama}.`,
    });
    return created;
  });
}

export async function deleteSupplier(id: string) {
  await latency("write");
  mutate((db) => {
    const s = db.suppliers.find((x) => x.id === id);
    if (!s) throw new ApiError(`${supplierLabel()} tidak ditemukan.`, 404);
    const used = db.scheduleAgreements.filter((sa) => sa.supplier === s.nama).length;
    if (used > 0) {
      throw new ApiError(
        `${s.nama} masih dipakai ${used} Schedule Agreement. Nonaktifkan saja agar riwayat kuota tetap utuh.`,
      );
    }
    db.suppliers = db.suppliers.filter((x) => x.id !== id);
    recordAudit(db, {
      action: "supplier.delete",
      entity: "Supplier",
      entityId: id,
      summary: `Menghapus ${supplierLabel()} ${s.nama}.`,
    });
  });
}

/* ── numbering & operations ────────────────────────────────────────────── */

export async function getSystemConfig() {
  await latency("read");
  const db = scopedDb();
  return {
    penomoran: { ...db.settings.penomoran },
    operasi: { ...db.settings.operasi },
  };
}

export async function saveNumbering(penomoran: NumberingEntity) {
  await latency("write");
  const invalid = Object.entries(penomoran).find(
    ([key, value]) => key !== "sertakanTanggal" && !String(value).trim(),
  );
  if (invalid) throw new Error("Setiap awalan dokumen wajib diisi.");

  return mutate((db) => {
    db.settings.penomoran = { ...penomoran };
    recordAudit(db, {
      action: "settings.numbering",
      entity: "Settings",
      entityId: "penomoran",
      summary: "Memperbarui awalan penomoran dokumen.",
    });
    return { ...db.settings.penomoran };
  });
}

export async function saveOperations(operasi: OperationsEntity) {
  await latency("write");
  if (operasi.hariKerja.length === 0) {
    throw new Error("Pilih minimal satu hari kerja.");
  }
  if (operasi.durasiSinggahMenit < 15) {
    throw new Error("Durasi singgah minimal 15 menit.");
  }
  // Below this, ordinary phone GPS error alone would flag honest deliveries.
  if (operasi.rekamLokasi && operasi.radiusGeofenceMeter < 50) {
    throw new Error("Radius wajar minimal 50 meter agar tidak salah menandai.");
  }
  return mutate((db) => {
    db.settings.operasi = { ...operasi };
    recordAudit(db, {
      action: "settings.operations",
      entity: "Settings",
      entityId: "operasi",
      summary: `Memperbarui jadwal operasi — ${operasi.hariKerja.length} hari kerja, singgah ${operasi.durasiSinggahMenit} menit.`,
    });
    return { ...db.settings.operasi };
  });
}
