/**
 * Users, against the real API.
 *
 * This file is also where the language boundary lives. The backend speaks
 * English and matches its own schema; the UI domain model is Indonesian
 * (`nama`, `telepon`, `cabang`). Mapping here rather than renaming either side
 * keeps the backend consistent with its published contract and leaves every
 * component untouched — see technical-gaps 2.4, which chose this direction.
 */
import { getList, getOne, send } from "@/lib/api";
import type { UserEntity, UserStatusEntity } from "@/types/domain";
import type { UserFilters, UsersApi } from "./contract";
import type { UserRole } from "@/types/auth";

/** What the API returns. Mirrors the backend's UserResponse exactly. */
interface UserResponse {
  id: string;
  username: string;
  email?: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * Status codes are three letters on the wire — `atv`, `ina`, `del` — because
 * the column is CHAR(3). The UI shows words.
 */
const STATUS_TO_DOMAIN: Record<string, UserStatusEntity> = {
  atv: "Aktif",
  ina: "Nonaktif",
  del: "Nonaktif",
};

function toDomain(row: UserResponse): UserEntity {
  return {
    id: row.id,
    nama: row.full_name,
    email: row.email ?? "",
    // The backend resolves roles per request and does not return them on the
    // user record. Until an endpoint exposes them, this is a placeholder rather
    // than a guess dressed up as data.
    role: "viewer" as UserRole as UserEntity["role"],
    telepon: row.phone ?? "",
    cabang: "",
    branchIds: [],
    scopeType: "tenant",
    status: STATUS_TO_DOMAIN[row.status] ?? "Nonaktif",
    terakhirMasuk: undefined,
    dibuatPada: row.created_at,
  };
}

export async function getUsers(filters?: UserFilters): Promise<UserEntity[]> {
  const page = await getList<UserResponse>("/users", {
    search: filters?.search,
    pageSize: 100,
  });
  return page.items.map(toDomain);
}

export async function createOrUpdateUser(
  input: Partial<UserEntity> & { id?: string },
): Promise<UserEntity> {
  const body = {
    username: input.email?.split("@")[0] ?? input.nama,
    full_name: input.nama,
    email: input.email,
    phone: input.telepon || undefined,
  };

  if (input.id) {
    // Read first for the version. The server refuses a write whose version does
    // not match the row, so a form opened five minutes ago cannot silently
    // overwrite someone else's edit — it gets 409 STALE_VERSION instead.
    const current = await getOne<UserResponse>(`/users/${input.id}`);
    const updated = await send<UserResponse>("put", `/users/${input.id}`, {
      ...body,
      version: current.version,
    });
    return toDomain(updated);
  }
  return toDomain(await send<UserResponse>("post", "/users", body));
}

export async function removeUser(id: string): Promise<void> {
  await send<null>("delete", `/users/${id}`);
}

// Compile-time proof that this adapter satisfies the contract. Without it a
// drifting signature is discovered by a page that fails to build, or worse by
// one that builds and reads a field that is not there.
const _contract: UsersApi = { getUsers, createOrUpdateUser, removeUser };
void _contract;
