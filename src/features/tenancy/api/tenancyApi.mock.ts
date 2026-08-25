/**
 * Tenancy, against the seed database.
 *
 * A peer of the HTTP adapter, not a leftover: this is what runs demos, and it
 * has to behave identically or the contract buys nothing.
 */
import { getDb, latency, mutate, nextId, recordAudit } from "@/mocks/db";
import { getActiveScope, subtreeOf } from "@/mocks/scope";
import { ApiError } from "@/mocks/db";
import type { ID, TenantEntity } from "@/types/domain";
import type {
  CreateTenantInput,
  CreateTenantResult,
  TenantAncestor,
  TenantDetail,
} from "./contract";

/** Starting vocabulary per business type, mirroring iam.business_types. */
const LEXICON_DEFAULTS: Record<string, { satuan: string; outlet: string; pemasok: string }> = {
  lpg_distribution: { satuan: "tabung", outlet: "pangkalan", pemasok: "SPBE" },
  water_depot: { satuan: "galon", outlet: "depot", pemasok: "pabrik" },
};

/** The chart of accounts a new tenant is provisioned with. */
const CHART_SIZE = 18;
/** Document series the branch trigger issues. */
const SEQUENCE_COUNT = 8;

/**
 * Every tenant the acting tenant may see.
 *
 * Descendants AND ancestors. Descendants so a group can administer what is
 * beneath it; ancestors so a child can name what it inherits from — the same two
 * arms the backend's iam.tenants policy carries.
 */
export async function getTenants(): Promise<TenantEntity[]> {
  await latency("read");
  const db = getDb();
  const acting = getActiveScope().actingTenantId;

  const visible = new Set(subtreeOf(db.tenants, acting));
  let current = db.tenants.find((t) => t.id === acting)?.indukId;
  const seen = new Set<ID>();
  while (current && !seen.has(current)) {
    seen.add(current);
    visible.add(current);
    current = db.tenants.find((t) => t.id === current)?.indukId;
  }

  return structuredClone(db.tenants.filter((t) => visible.has(t.id)));
}

export async function getTenant(id: ID): Promise<TenantDetail> {
  await latency("read");
  const db = getDb();
  const tenant = db.tenants.find((t) => t.id === id);
  if (!tenant) throw new ApiError("Tenant tidak ditemukan.");

  // Root first, which is what makes it read as a breadcrumb rather than a path
  // from the leaf outward.
  const leluhur: TenantAncestor[] = [];
  let current = tenant.indukId;
  let jarak = 1;
  const seen = new Set<ID>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const ancestor = db.tenants.find((t) => t.id === current);
    if (ancestor) leluhur.unshift({ id: ancestor.id, kode: ancestor.kode, nama: ancestor.nama, jarak });
    current = ancestor?.indukId ?? null;
    jarak += 1;
  }

  const own = db.settingsByTenant.find((r) => r.tenantId === id)?.values;
  return {
    ...structuredClone(tenant),
    leluhur,
    profil: own
      ? {
          namaLegal: own.namaPerusahaan ?? tenant.nama,
          nomorRegistrasi: own.nomorAgen,
          pkp: false,
          tarifPajakDefault: 0,
          alamat: own.alamat,
          telepon: own.telepon,
          email: own.email,
          zonaWaktu: own.zonaWaktu ?? "Asia/Jakarta",
        }
      : undefined,
  };
}

/**
 * Provisions a sub-tenant beneath the acting tenant.
 *
 * Mirrors what the backend service does in one transaction: the tenant, its
 * settings seeded from the business type's lexicon, and its first branch. The
 * branch is not optional — without it the tenant cannot record a delivery, an
 * invoice or a payment.
 */
export async function createTenant(input: CreateTenantInput): Promise<CreateTenantResult> {
  await latency("write");

  return mutate((db) => {
    if (db.tenants.some((t) => t.kode === input.kode)) {
      throw new ApiError(`Kode tenant "${input.kode}" sudah dipakai.`);
    }
    if (!input.pkp && input.tarifPajakDefault !== 0) {
      throw new ApiError(
        "Tenant yang belum PKP tidak boleh memiliki tarif pajak default.",
      );
    }

    const parent = db.tenants.find((t) => t.id === getActiveScope().actingTenantId);
    if (!parent) throw new ApiError("Tidak ada tenant aktif.");

    const tenant: TenantEntity = {
      id: nextId("tnt"),
      kode: input.kode,
      nama: input.nama,
      indukId: parent.id,
      // Absolute, counted from the root — the same as the backend's depth.
      level: parent.level + 1,
      jenisUsaha: input.jenisUsaha,
      jenis: "operasional",
      aktif: true,
    };
    db.tenants.push(tenant);

    const istilah = LEXICON_DEFAULTS[input.jenisUsaha] ?? LEXICON_DEFAULTS.lpg_distribution;
    // Only the lexicon and identity. Everything else stays absent so it
    // inherits — writing defaults here would pin values the parent later
    // changes.
    db.settingsByTenant.push({
      tenantId: tenant.id,
      values: {
        namaPerusahaan: input.namaLegal,
        nomorAgen: input.nomorRegistrasi,
        telepon: input.telepon,
        email: input.email,
        istilah: { ...istilah },
      },
    });

    db.branches.push({
      id: nextId("brc"),
      tenantId: tenant.id,
      kode: input.cabangKode,
      nama: input.cabangNama,
      kota: input.cabangKota ?? input.kota ?? "",
      provinsi: input.provinsi ?? "Jawa Tengah",
      alamat: "",
      penanggungJawab: "",
      telepon: input.telepon ?? "",
      lat: input.lat ?? 0,
      lng: input.lng ?? 0,
      utama: true,
      aktif: true,
    });

    recordAudit(db, {
      action: "tenant.create",
      entity: "Tenant",
      entityId: tenant.id,
      summary: `Membuat tenant "${tenant.nama}" di bawah ${parent.nama}.`,
    });

    return {
      tenant: structuredClone(tenant),
      istilah: { ...istilah },
      jumlahAkun: CHART_SIZE,
      jumlahPenomoran: SEQUENCE_COUNT,
      pendiriDitunjuk: true,
    };
  });
}

/**
 * Marks a tenant inactive. Never removes it.
 *
 * Refused while descendants are still active: a group whose subsidiaries are
 * trading is not a group anyone meant to switch off, and cascading would be one
 * action ending several companies.
 */
export async function deactivateTenant(id: ID): Promise<void> {
  await latency("write");
  mutate((db) => {
    const tenant = db.tenants.find((t) => t.id === id);
    if (!tenant) throw new ApiError("Tenant tidak ditemukan.");
    if (db.tenants.some((t) => t.indukId === id && t.aktif)) {
      throw new ApiError("Tenant ini masih memiliki sub-tenant aktif. Nonaktifkan itu dulu.");
    }
    tenant.aktif = false;
    recordAudit(db, {
      action: "tenant.deactivate",
      entity: "Tenant",
      entityId: id,
      summary: `Menonaktifkan tenant "${tenant.nama}".`,
    });
  });
}
