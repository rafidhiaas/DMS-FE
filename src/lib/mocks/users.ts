import type { UserSummary } from "@/types";

/**
 * MOCK — backend belum punya endpoint list/search user.
 * Dipakai sementara oleh modal Share agar UI bisa dibangun & diuji.
 * Ganti dengan panggilan API asli begitu backend menyediakan `/api/users`.
 * Lihat catatan gap backend.
 */
export const MOCK_USERS: UserSummary[] = [
  { id: "11111111-1111-1111-1111-111111111111", name: "Andi Wijaya", email: "andi@dms.test", role: "EMPLOYEE" },
  { id: "22222222-2222-2222-2222-222222222222", name: "Bunga Lestari", email: "bunga@dms.test", role: "COMPANY_ADMIN" },
  { id: "33333333-3333-3333-3333-333333333333", name: "Citra Dewi", email: "citra@dms.test", role: "EMPLOYEE" },
  { id: "44444444-4444-4444-4444-444444444444", name: "Dodi Pratama", email: "dodi@dms.test", role: "AUDITOR" },
  { id: "55555555-5555-5555-5555-555555555555", name: "Eka Saputra", email: "eka@dms.test", role: "EMPLOYEE" },
];

/** Cari user berdasarkan nama/email (simulasi endpoint search). */
export function searchMockUsers(query: string): UserSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOCK_USERS;
  return MOCK_USERS.filter(
    (u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
}
