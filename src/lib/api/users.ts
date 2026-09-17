import { api } from "@/lib/api/client";
import type { ManagedUser, Role, UserSummary } from "@/types";
import { mapUserSummary, unwrap, type BeUser } from "@/lib/api/_transform";

/**
 * Lapisan akses data Pengguna → backend Express `/api/users` (lewat BFF).
 * Aturan RBAC ditegakkan backend; `canManageUser` hanya untuk menyembunyikan aksi di UI.
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
  createdAt?: string;
}

function mapManagedUser(u: BeManagedUser): ManagedUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active ?? true,
    last_login_at: u.lastLoginAt ?? null,
    created_at: u.createdAt ?? "",
  };
}

// ============ LIST (admin) ============
export async function fetchUsers(query = "", includeInactive = false): Promise<ManagedUser[]> {
  const { data } = await api.get<unknown>("/users", {
    params: {
      search: query || undefined,
      include_inactive: includeInactive || undefined,
      limit: 200,
    },
  });
  return (unwrap<BeManagedUser[]>(data) ?? []).map(mapManagedUser);
}

// ============ SEARCH (semua peran — pemilih penerima share) ============
export async function searchUsers(query = ""): Promise<UserSummary[]> {
  const { data } = await api.get<unknown>("/users/search", { params: { q: query || undefined } });
  return (unwrap<BeUser[]>(data) ?? []).map(mapUserSummary) as UserSummary[];
}

// ============ CREATE ============
export async function createUser(input: {
  name: string;
  email: string;
  role: Role;
  password: string;
}): Promise<ManagedUser> {
  const { data } = await api.post<unknown>("/users", input);
  return mapManagedUser(unwrap<BeManagedUser>(data));
}

// ============ UPDATE ============
export async function updateUser(
  id: string,
  patch: { name?: string; role?: Role; active?: boolean },
): Promise<ManagedUser> {
  const { data } = await api.patch<unknown>(`/users/${id}`, patch);
  return mapManagedUser(unwrap<BeManagedUser>(data));
}

// ============ RESET PASSWORD ============
export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await api.post(`/users/${id}/reset-password`, { newPassword });
}

// ============ DELETE (BE: soft delete → active=false) ============
export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}