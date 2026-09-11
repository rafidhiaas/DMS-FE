import type { Role } from "@/types";

/** Nama cookie sesi (semua HttpOnly). */
export const COOKIE = {
  access: "dms_access",
  refresh: "dms_refresh",
  user: "dms_user",
} as const;

/** Rute yang wajib login. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/folders",
  "/documents",
  "/shared",
  "/audit",
  "/users",
  "/trash",
  "/metadata",
  "/settings",
] as const;

/** Halaman auth — jika sudah login, dilempar ke dashboard. */
export const AUTH_PAGES = ["/login", "/register"] as const;

/** Label peran untuk tampilan UI. */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  COMPANY_ADMIN: "Admin Perusahaan",
  AUDITOR: "Auditor",
  EMPLOYEE: "Karyawan",
};

/** Peran dengan akses global (baca semua audit log). */
export const GLOBAL_AUDIT_ROLES: Role[] = ["SUPER_ADMIN", "AUDITOR"];
