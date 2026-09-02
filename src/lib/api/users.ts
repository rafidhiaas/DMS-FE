import { allMockUsers } from "@/lib/mocks/audit-store";
import type { UserSummary } from "@/types";

/**
 * Lapisan akses data Pengguna.
 * CATATAN GAP BACKEND: Express belum punya endpoint list/search user
 * (`GET /api/users`), jadi lapisan ini SELALU memakai mock — terlepas dari
 * USE_MOCKS — sampai backend menyediakannya.
 */

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function fetchUsers(query = ""): Promise<UserSummary[]> {
  const q = query.trim().toLowerCase();
  const users = allMockUsers();
  if (!q) return delay(users);
  return delay(
    users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    ),
  );
}
