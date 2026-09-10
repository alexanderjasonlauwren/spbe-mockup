import { scopedDb } from "@/mocks/scope";
import { ApiError, latency, mutate, nextId, recordAudit } from "@/mocks/db";
import type { BankAccountEntity } from "@/types/domain";
import type { BankAccountApi } from "./contract";

async function getBankAccounts(): Promise<BankAccountEntity[]> {
  await latency("read");
  return scopedDb().bankAccounts.slice();
}

async function saveBankAccount(
  input: Partial<BankAccountEntity> & { id?: string },
): Promise<BankAccountEntity> {
  await latency("write");
  return mutate((db) => {
    if (!input.nomorRekening?.trim())
      throw new ApiError("Nomor rekening wajib diisi.");
    if (!input.atasNama?.trim()) throw new ApiError("Nama pemilik rekening wajib diisi.");

    const clash = db.bankAccounts.find(
      (a) => a.nomorRekening === input.nomorRekening!.trim() && a.id !== input.id,
    );
    if (clash) throw new ApiError("Nomor rekening tersebut sudah terdaftar.", 409);

    const applyPrimary = (target: BankAccountEntity) => {
      // Only one account can be the default printed on invoices.
      if (target.utama) {
        db.bankAccounts.forEach((a) => {
          if (a.id !== target.id) a.utama = false;
        });
      } else if (!db.bankAccounts.some((a) => a.utama)) {
        target.utama = true;
      }
    };

    if (input.id) {
      const existing = db.bankAccounts.find((a) => a.id === input.id);
      if (!existing) throw new ApiError("Rekening tidak ditemukan.", 404);
      Object.assign(existing, input);
      applyPrimary(existing);
      recordAudit(db, {
        action: "bank.update",
        entity: "BankAccount",
        entityId: existing.id,
        summary: `Memperbarui rekening ${existing.bank} ${existing.nomorRekening}.`,
      });
      return existing;
    }

    const created: BankAccountEntity = {
      id: nextId("bank"),
      bank: input.bank ?? "BCA",
      nomorRekening: input.nomorRekening.trim(),
      atasNama: input.atasNama.trim(),
      cabang: input.cabang ?? "",
      utama: input.utama ?? false,
      aktif: input.aktif ?? true,
    };
    db.bankAccounts.push(created);
    applyPrimary(created);
    recordAudit(db, {
      action: "bank.create",
      entity: "BankAccount",
      entityId: created.id,
      summary: `Menambahkan rekening ${created.bank} ${created.nomorRekening}.`,
    });
    return created;
  });
}

async function deleteBankAccount(id: string): Promise<void> {
  await latency("write");
  mutate((db) => {
    const a = db.bankAccounts.find((x) => x.id === id);
    if (!a) throw new ApiError("Rekening tidak ditemukan.", 404);
    if (a.utama && db.bankAccounts.length > 1) {
      throw new ApiError(
        "Rekening utama tidak dapat dihapus. Tetapkan rekening lain sebagai utama terlebih dahulu.",
      );
    }
    db.bankAccounts = db.bankAccounts.filter((x) => x.id !== id);
    recordAudit(db, {
      action: "bank.delete",
      entity: "BankAccount",
      entityId: id,
      summary: `Menghapus rekening ${a.bank} ${a.nomorRekening}.`,
    });
  });
}

export const bankAccountApiMock: BankAccountApi = {
  getBankAccounts,
  saveBankAccount,
  deleteBankAccount,
};
