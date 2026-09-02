import type { ActivityLog, ActivityLogPage, UserSummary } from "@/types";
import { MOCK_ACCOUNTS } from "@/lib/mocks/auth";
import { MOCK_USERS } from "@/lib/mocks/users";
import { getMockActor } from "@/lib/mocks/actor";

/**
 * MOCK store Audit Log — persist di localStorage, meniru perilaku backend:
 * - Setiap aksi penting dicatat (create/rename/delete/share/download/dst).
 * - SUPER_ADMIN & AUDITOR melihat semua log; peran lain hanya log miliknya.
 * Ganti dengan API asli (/api/activity-logs) begitu backend + DB siap.
 */

const STORAGE_KEY = "dms_mock_audit_v1";
const MOCK_IP = "127.0.0.1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `log-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(offsetHours = 0): string {
  const d = new Date();
  d.setHours(d.getHours() - offsetHours);
  return d.toISOString();
}

/** Semua user yang dikenal mock (akun demo + user mock share). */
export function allMockUsers(): UserSummary[] {
  return [...Object.values(MOCK_ACCOUNTS), ...MOCK_USERS];
}

function resolveUser(userId: string): UserSummary | undefined {
  return allMockUsers().find((u) => u.id === userId);
}

function seed(): ActivityLog[] {
  const admin = MOCK_ACCOUNTS.COMPANY_ADMIN;
  const employee = MOCK_ACCOUNTS.EMPLOYEE;
  const superAdmin = MOCK_ACCOUNTS.SUPER_ADMIN;

  const entries: Array<Pick<ActivityLog, "user_id" | "action" | "details"> & { hoursAgo: number }> = [
    { user_id: superAdmin.id, action: "LOGIN", details: "Login berhasil.", hoursAgo: 76 },
    { user_id: employee.id, action: "CREATE_FOLDER", details: 'Membuat folder "Keuangan"', hoursAgo: 72 },
    { user_id: employee.id, action: "CREATE_FOLDER", details: 'Membuat folder "Legal & Kontrak"', hoursAgo: 70 },
    { user_id: employee.id, action: "CREATE_DOCUMENT", details: 'Mengunggah dokumen "Laporan Keuangan Q4" (v1)', hoursAgo: 60 },
    { user_id: employee.id, action: "UPLOAD_VERSION", details: 'Mengunggah versi 2 dokumen "Laporan Keuangan Q4" — Revisi angka pendapatan.', hoursAgo: 30 },
    { user_id: admin.id, action: "LOGIN", details: "Login berhasil.", hoursAgo: 28 },
    { user_id: admin.id, action: "SHARE_DOCUMENT", details: 'Membagikan dokumen "Laporan Keuangan Q4" ke user andi@dms.test dengan akses DOWNLOADER', hoursAgo: 27 },
    { user_id: admin.id, action: "SHARE_DOCUMENT", details: 'Membagikan dokumen "Perjanjian Kerja Sama Vendor" ke user citra@dms.test dengan akses VIEWER', hoursAgo: 26 },
    { user_id: employee.id, action: "RENAME_DOCUMENT", details: 'Mengganti judul dokumen menjadi "Anggaran Operasional"', hoursAgo: 20 },
    { user_id: superAdmin.id, action: "DELETE_FOLDER", details: 'Menghapus folder "Arsip Lama"', hoursAgo: 12 },
    { user_id: admin.id, action: "UPDATE_SHARE_ACCESS", details: "Mengubah level akses share menjadi EDITOR", hoursAgo: 8 },
    { user_id: employee.id, action: "LOGOUT", details: "Logout berhasil.", hoursAgo: 5 },
  ];

  return entries.map((e) => ({
    id: uuid(),
    user_id: e.user_id,
    action: e.action,
    details: e.details,
    ip_address: MOCK_IP,
    created_at: nowIso(e.hoursAgo),
  }));
}

function load(): ActivityLog[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as ActivityLog[];
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function save(logs: ActivityLog[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Catat aktivitas atas nama user yang sedang login (dipanggil mock store lain). */
export function recordActivity(action: string, details: string): void {
  if (typeof window === "undefined") return;
  const actor = getMockActor();
  const logs = load();
  logs.unshift({
    id: uuid(),
    user_id: actor.id,
    action,
    details,
    ip_address: MOCK_IP,
    created_at: new Date().toISOString(),
  });
  save(logs);
}

export const mockAuditStore = {
  /** Meniru GET /activity-logs — filter action + pagination + pembatasan peran. */
  async getLogs(input: {
    action?: string;
    page: number;
    limit: number;
  }): Promise<ActivityLogPage> {
    const actor = getMockActor();
    const globalAccess = actor.role === "SUPER_ADMIN" || actor.role === "AUDITOR";

    let logs = load();
    if (!globalAccess) logs = logs.filter((l) => l.user_id === actor.id);
    if (input.action) logs = logs.filter((l) => l.action === input.action);

    logs.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const total = logs.length;
    const start = (input.page - 1) * input.limit;
    const pageLogs = logs.slice(start, start + input.limit).map((l) => ({
      ...l,
      user: resolveUser(l.user_id),
    }));

    return delay({
      logs: pageLogs,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
      },
    });
  },

  /** Jumlah aktivitas per hari selama N hari terakhir (mengikuti pembatasan peran). */
  async getSeries(days: number): Promise<Array<{ date: string; count: number }>> {
    const actor = getMockActor();
    const globalAccess = actor.role === "SUPER_ADMIN" || actor.role === "AUDITOR";
    let logs = load();
    if (!globalAccess) logs = logs.filter((l) => l.user_id === actor.id);

    const series: Array<{ date: string; count: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      series.push({
        date: d.toISOString(),
        count: logs.filter((l) => new Date(l.created_at).toDateString() === key).length,
      });
    }
    return delay(series);
  },

  /** Meniru GET /activity-logs/export — susun CSV dengan format sama seperti backend. */
  async exportCsv(): Promise<string> {
    const logs = load().sort((a, b) => b.created_at.localeCompare(a.created_at));
    const safe = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const header = "Timestamp,User,Email,Action,Details,IP Address\n";
    const rows = logs
      .map((l) => {
        const user = resolveUser(l.user_id);
        return [
          l.created_at,
          safe(user?.name ?? l.user_id),
          safe(user?.email ?? "-"),
          l.action,
          safe(l.details),
          l.ip_address,
        ].join(",");
      })
      .join("\n");
    return delay(header + rows);
  },
};
