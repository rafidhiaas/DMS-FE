import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockUsersStore } from "@/lib/mocks/users-store";
import { recordActivity } from "@/lib/mocks/audit-store";
import { getMockActor } from "@/lib/mocks/actor";
import type { ManagedUser, Role } from "@/types";
import { mapUserSummary, unwrap } from "@/lib/api/_transform";

const ADMIN_ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN"];

export function canManageUser(actorRole: Role, targetRole: Role): boolean {
  if (!ADMIN_ROLES.includes(actorRole)) return false;
  if (actorRole === "COMPANY_ADMIN" && targetRole === "SUPER_ADMIN") return false;
  return true;
}

// ============ LIST ============
export async function fetchUsers(query = "", includeInactive = false): Promise<ManagedUser[]> {
  if (env.USE_MOCKS) return mockUsersStore.list(query, includeInactive);
  const { data } = await api.get<any>("/users", {
    params: {
      search: query || undefined,
      include_inactive: includeInactive || undefined,
      limit: 100,
    },
  });
  const users = unwrap<any[]>(data) ?? [];
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active ?? true,
    last_login_at: u.lastLoginAt ?? null,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  })) as ManagedUser[];
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
    const user = await mockUsersStore.create(input as any);
    recordActivity("CREATE_USER", `Menambahkan pengguna ${user.email}`);
    return user;
  }
  // ⚠️ BE butuh password — generate default kalau tidak ada
  const password = input.password ?? `Temp${Date.now()}!`;
  const { data } = await api.post<any>("/users", {
    name: input.name,
    email: input.email,
    role: input.role,
    password,
  });
  const user = unwrap<any>(data);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active ?? true,
    last_login_at: user.lastLoginAt ?? null,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  } as ManagedUser;
}

// ============ UPDATE ============
export async function updateUser(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean },
): Promise<ManagedUser> {
  if (env.USE_MOCKS) {
    // ... (sama seperti asli)
    const actor = getMockActor();
    const current = (await mockUsersStore.list("", true)).find((u) => u.id === id);
    if (!current) throw new Error("Pengguna tidak ditemukan.");
    if (!canManageUser(actor.role, current.role))
      throw new Error("Anda tidak berwenang mengubah pengguna ini.");
    const user = await mockUsersStore.update(id, patch);
    return user;
  }
  const { data } = await api.patch<any>(`/users/${id}`, patch);
  const user = unwrap<any>(data);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active ?? true,
    last_login_at: user.lastLoginAt ?? null,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  } as ManagedUser;
}

// ============ DELETE (soft) ============
export async function deleteUser(id: string): Promise<void> {
  if (env.USE_MOCKS) {
    // ... (sama seperti asli)
    const actor = getMockActor();
    if (id === actor.id) throw new Error("Anda tidak dapat menghapus akun sendiri.");
    await mockUsersStore.remove(id);
    return;
  }
  // ✅ BE: DELETE = soft delete (active=false)
  await api.delete(`/users/${id}`);
}