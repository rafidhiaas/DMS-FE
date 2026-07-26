import type { AuthUser, Role } from "@/types";

/**
 * MOCK — akun demo per-peran untuk login tanpa backend/database.
 * Hanya aktif saat NEXT_PUBLIC_USE_MOCKS=true. Hapus/matikan flag saat
 * backend Express + PostgreSQL sudah siap dipakai untuk login nyata.
 */
export const MOCK_ACCOUNTS: Record<Role, AuthUser> = {
  SUPER_ADMIN: {
    id: "mock-super-admin",
    name: "Raka Superadmin",
    email: "super@dms.test",
    role: "SUPER_ADMIN",
  },
  COMPANY_ADMIN: {
    id: "mock-company-admin",
    name: "Bunga Admin",
    email: "admin@dms.test",
    role: "COMPANY_ADMIN",
  },
  AUDITOR: {
    id: "mock-auditor",
    name: "Dodi Auditor",
    email: "auditor@dms.test",
    role: "AUDITOR",
  },
  EMPLOYEE: {
    id: "mock-employee",
    name: "Andi Karyawan",
    email: "karyawan@dms.test",
    role: "EMPLOYEE",
  },
};
