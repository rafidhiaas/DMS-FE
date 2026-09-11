import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockUsersStore } from "@/lib/mocks/users-store";
import { recordActivity } from "@/lib/mocks/audit-store";
import { getMockActor } from "@/lib/mocks/actor";
import type { ManagedUser, Role } from "@/types";

/**
 * Lapisan akses data Pengguna.
 * CATATAN GAP BACKEND: Express baru punya /auth/register. List, ubah peran,
 * nonaktifkan, dan hapus belum ada — usulan: GET/POST /users, PATCH/DELETE /users/:id.
 * Mode backend memakai path tersebut; mode mock memakai store lokal + aturan RBAC di sini.
 */

const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN"];

/** Aturan: COMPANY_ADMIN tidak boleh menyentuh SUPER_ADMIN atau membuat SUPER_ADMIN. */
export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (!ADMIN_ROLES.includes(actorRole)) return false;
  if (actorRole === "COMPANY_ADMIN" && targetRole === "SUPER_ADMIN") return false;
  return true;
}

export async function fetchUsers(query = "", includeInactive = false): Promise<ManagedUser[]> {
  if (env.USE_MOCKS) return mockUsersStore.list(query, includeInactive);
  const { data } = await api.get<{ users: ManagedUser[] }>("/users", {
    params: { q: query || undefined, include_inactive: includeInactive || undefined },
  });
  return data.users;
}

export async function createUser(input: { name: string; email: string; role: Role }): Promise<ManagedUser> {
  if (env.USE_MOCKS) {
    const actor = getMockActor();
    if (!canManageUser(actor.role, input.role)) throw new Error("Anda tidak berwenang membuat pengguna dengan peran ini.");
    const user = await mockUsersStore.create(input);
    recordActivity("CREATE_USER", `Menambahkan pengguna ${user.email} dengan peran ${user.role}`);
    return user;
  }
  const { data } = await api.post<{ user: ManagedUser }>("/users", input);
  return data.user;
}

export async function updateUser(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean },
): Promise<ManagedUser> {
  if (env.USE_MOCKS) {
    const actor = getMockActor();
    const current = (await mockUsersStore.list("", true)).find((u) => u.id === id);
    if (!current) throw new Error("Pengguna tidak ditemukan.");
    if (!canManageUser(actor.role, current.role)) throw new Error("Anda tidak berwenang mengubah pengguna ini.");
    if (patch.role && !canManageUser(actor.role, patch.role)) throw new Error("Anda tidak berwenang memberi peran ini.");
    if (id === actor.id && patch.active === false) throw new Error("Anda tidak dapat menonaktifkan akun sendiri.");
    if (id === actor.id && patch.role && patch.role !== actor.role) throw new Error("Anda tidak dapat mengubah peran sendiri.");
    const user = await mockUsersStore.update(id, patch);
    if (patch.active === false) recordActivity("DEACTIVATE_USER", `Menonaktifkan pengguna ${user.email}`);
    else if (patch.active === true) recordActivity("ACTIVATE_USER", `Mengaktifkan kembali pengguna ${user.email}`);
    else recordActivity("UPDATE_USER", `Mengubah pengguna ${user.email}${patch.role ? ` → peran ${patch.role}` : ""}`);
    return user;
  }
  const { data } = await api.patch<{ user: ManagedUser }>(`/users/${id}`, patch);
  return data.user;
}

export async function deleteUser(id: string): Promise<void> {
  if (env.USE_MOCKS) {
    const actor = getMockActor();
    if (id === actor.id) throw new Error("Anda tidak dapat menghapus akun sendiri.");
    const current = (await mockUsersStore.list("", true)).find((u) => u.id === id);
    if (!current) throw new Error("Pengguna tidak ditemukan.");
    if (!canManageUser(actor.role, current.role)) throw new Error("Anda tidak berwenang menghapus pengguna ini.");
    await mockUsersStore.remove(id);
    recordActivity("DELETE_USER", `Menghapus pengguna ${current.email}`);
    return;
  }
  await api.delete(`/users/${id}`);
}
