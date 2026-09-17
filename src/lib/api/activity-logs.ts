import { api } from "@/lib/api/client";
import type { ActivityLog, ActivityLogPage, Role } from "@/types";

/** Lapisan akses data Audit Log → backend Express `/api/activity-logs` (lewat BFF). */

/** Raw response dari BE (camelCase). */
export interface BackendActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  documentId: string | null;
  details: string | null;
  ipAddress: string;
  userAgent: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role?: Role };
}

interface BackendActivityLogResponse {
  success: boolean;
  data: BackendActivityLog[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const DETAIL_LABELS: Record<string, string> = {
  fileName: "berkas",
  fileSize: "ukuran",
  version: "versi",
  changelog: "catatan versi",
  reason: "alasan",
  email: "email",
  name: "nama",
  count: "jumlah",
  mode: "mode",
  access: "akses",
  rules: "aturan",
  trigger: "pemicu",
  type: "jenis",
  expiresInDays: "berlaku (hari)",
};

function show(value: unknown): string {
  if (Array.isArray(value)) return value.map(show).join(", ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * BE menyimpan `details` sebagai JSON (mis. {"title":"X","from":"DRAFT","to":"APPROVED"}).
 * Diringkas jadi satu kalimat agar enak dibaca di tabel audit & tab Riwayat.
 */
export function formatLogDetails(raw: string | null): string {
  if (!raw) return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw; // sudah berupa kalimat (mis. log share)
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return show(parsed);

  const d = parsed as Record<string, unknown>;
  const parts: string[] = [];
  if (d.title) parts.push(`"${show(d.title)}"`);
  if (d.from && d.to) parts.push(`${show(d.from)} → ${show(d.to)}`);
  for (const [key, value] of Object.entries(d)) {
    if (["title", "from", "to", "changes"].includes(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    parts.push(`${DETAIL_LABELS[key] ?? key}: ${show(value)}`);
  }
  if (d.changes && typeof d.changes === "object") {
    const keys = Object.keys(d.changes as object);
    if (keys.length) parts.push(`ubah: ${keys.join(", ")}`);
  }
  return parts.join(" · ");
}

/** Map BE shape (camelCase) → FE shape (snake_case). */
export function mapActivityLog(item: BackendActivityLog): ActivityLog {
  return {
    id: item.id,
    user_id: item.userId,
    action: item.action,
    details: formatLogDetails(item.details),
    ip_address: item.ipAddress,
    created_at: item.createdAt,
    user: item.user
      ? {
          id: item.user.id,
          name: item.user.name,
          email: item.user.email,
          role: item.user.role ?? "EMPLOYEE",
        }
      : undefined,
    document_id: item.documentId ?? null,
  };
}

/** Audit log lengkap (admin & auditor). */
export async function fetchActivityLogs(input: {
  action?: string;
  page: number;
  limit: number;
}): Promise<ActivityLogPage> {
  const { data } = await api.get<BackendActivityLogResponse>("/activity-logs", {
    params: {
      page: input.page,
      limit: input.limit,
      ...(input.action ? { action: input.action } : {}),
    },
  });

  return {
    logs: (data.data ?? []).map(mapActivityLog),
    pagination: data.pagination ?? {
      page: input.page,
      limit: input.limit,
      total: 0,
      totalPages: 0,
    },
  };
}

/** Aktivitas milik user yang login (semua peran) — untuk dashboard karyawan. */
export async function fetchMyActivity(limit = 10): Promise<ActivityLog[]> {
  const { data } = await api.get<BackendActivityLogResponse>("/activity-logs/me", {
    params: { limit },
  });
  return (data.data ?? []).map(mapActivityLog);
}

/** Riwayat aktivitas satu dokumen (tab "Riwayat" di halaman detail). */
export async function fetchDocumentHistory(documentId: string): Promise<ActivityLog[]> {
  const { data } = await api.get<BackendActivityLogResponse>(`/documents/${documentId}/history`);
  return (data.data ?? []).map(mapActivityLog);
}

/** Ambil CSV export (string mentah). */
export async function fetchActivityLogsCsv(): Promise<string> {
  const { data } = await api.get<string>("/activity-logs/export", {
    responseType: "text",
    transformResponse: (v) => v,
  });
  return data;
}