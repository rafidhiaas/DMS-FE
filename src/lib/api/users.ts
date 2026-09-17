import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockUsersStore } from "@/lib/mocks/users-store";
import { recordActivity } from "@/lib/mocks/audit-store";
import { getMockActor } from "@/lib/mocks/actor";
import type { ManagedUser, Role } from "@/types";
import { unwrap, type BeUser } from "@/lib/api/_transform";

/**
 * Lapisan akses data Pengguna (mock ↔ backend Express /api/users).
 * Mode mock memakai store lokal + aturan RBAC di sini; backend menegakkan aturannya sendiri.
 */

const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN"];

/** Aturan: COMPANY_ADMIN tidak boleh menyentuh SUPER_ADMIN atau membuat SUPER_ADMIN. */
export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (!ADMIN_ROLES.includes(actorRole)) return false;
  if (actorRole === "COMPANY_ADMIN" && targetRole === "SUPER_ADMIN") return false;
  return true;
}

/** Bentuk user dari BE (camelCase). */
interface BeManagedUser extends BeUser {
  active?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

function mapManagedUser(u: BeManagedUser): ManagedUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active ?? true,
    last_login_at: u.lastLoginAt ?? null,
    created_at: u.createdAt,
  };
}

// ============ LIST ============
export async function fetchUsers(query = "", includeInactive = false): Promise<ManagedUser[]> {
  if (env.USE_MOCKS) return mockUsersStore.list(query, includeInactive);
  const { data } = await api.get<unknown>("/users", {
    params: {
      search: query || undefined,
      include_inactive: includeInactive || undefined,
      limit: 100,
    },
  });
  return (unwrap<BeManagedUser[]>(data) ?? []).map(mapManagedUser);
}

// ============ CREATE ============
export async function createUser(input: {
  name: string;
  email: string;
  role: Role;
  password?: string;
}): Promise<ManagedUser> {
  if (env.USE_MOCKS) {
    const actor = getMockActor();
    if (!canManageUser(actor.role, input.role))
      throw new Error("Anda tidak berwenang membuat pengguna dengan peran ini.");
    const user = await mockUsersStore.create(input);
    recordActivity("CREATE_USER", `Menambahkan pengguna ${user.email} dengan peran ${user.role}`);
    return user;
  }
  // ⚠️ BE butuh password — generate default kalau tidak ada
  const password = input.password ?? `Temp${Date.now()}!`;
  const { data } = await api.post<unknown>("/users", {
    name: input.name,
    email: input.email,
    role: input.role,
    password,
  });
  return mapManagedUser(unwrap<BeManagedUser>(data));
}

// ============ UPDATE ============
export async function updateUser(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean },
): Promise<ManagedUser> {
  if (env.USE_MOCKS) {
    const actor = getMockActor();
    const current = (await mockUsersStore.list("", true)).find((u) => u.id === id);
    if (!current) throw new Error("Pengguna tidak ditemukan.");
    if (!canManageUser(actor.role, current.role))
      throw new Error("Anda tidak berwenang mengubah pengguna ini.");
    if (patch.role && !canManageUser(actor.role, patch.role))
      throw new Error("Anda tidak berwenang memberi peran ini.");
    if (id === actor.id && patch.active === false)
      throw new Error("Anda tidak dapat menonaktifkan akun sendiri.");
    if (id === actor.id && patch.role && patch.role !== actor.role)
      throw new Error("Anda tidak dapat mengubah peran sendiri.");
    const user = await mockUsersStore.update(id, patch);
    if (patch.active === false) recordActivity("DEACTIVATE_USER", `Menonaktifkan pengguna ${user.email}`);
    else if (patch.active === true)
      recordActivity("ACTIVATE_USER", `Mengaktifkan kembali pengguna ${user.email}`);
    else
      recordActivity(
        "UPDATE_USER",
        `Mengubah pengguna ${user.email}${patch.role ? ` → peran ${patch.role}` : ""}`,
      );
    return user;
  }
  const { data } = await api.patch<unknown>(`/users/${id}`, patch);
  return mapManagedUser(unwrap<BeManagedUser>(data));
}

// ============ DELETE (soft) ============
export async function deleteUser(id: string): Promise<void> {
  if (env.USE_MOCKS) {
    const actor = getMockActor();
    if (id === actor.id) throw new Error("Anda tidak dapat menghapus akun sendiri.");
    const current = (await mockUsersStore.list("", true)).find((u) => u.id === id);
    if (!current) throw new Error("Pengguna tidak ditemukan.");
    if (!canManageUser(actor.role, current.role))
      throw new Error("Anda tidak berwenang menghapus pengguna ini.");
    await mockUsersStore.remove(id);
    recordActivity("DELETE_USER", `Menghapus pengguna ${current.email}`);
    return;
  }
  // BE: DELETE = soft delete (active=false)
  await api.delete(`/users/${id}`);
}
