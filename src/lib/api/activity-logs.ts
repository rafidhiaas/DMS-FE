import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockAuditStore } from "@/lib/mocks/audit-store";
import type { ActivityLog, ActivityLogPage, UserSummary } from "@/types";

/** Lapisan akses data Audit Log (mock ↔ backend Express /api/activity-logs). */

/** Raw response dari BE (camelCase). */
interface BackendActivityLog {
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
  user?: { id: string; name: string; email: string; role?: string };
}

interface BackendActivityLogResponse {
  success: boolean;
  data: BackendActivityLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Map BE shape (camelCase) → FE shape (snake_case). */
function mapActivityLog(item: BackendActivityLog): ActivityLog {
  return {
    id: item.id,
    user_id: item.userId,
    action: item.action,
    details: item.details ?? "",
    ip_address: item.ipAddress,
    created_at: item.createdAt,
    user: item.user
      ? ({
          id: item.user.id,
          name: item.user.name,
          email: item.user.email,
        } as UserSummary)
      : undefined,
    document_id: item.documentId ?? null,
  };
}

export async function fetchActivityLogs(input: {
  action?: string;
  page: number;
  limit: number;
}): Promise<ActivityLogPage> {
  if (env.USE_MOCKS) return mockAuditStore.getLogs(input);

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

/**
 * Riwayat aktivitas satu dokumen (tab "Riwayat" di halaman detail).
 * BE sudah punya `document_id` di ActivityLog, jadi bisa aktif.
 */
export async function fetchDocumentHistory(
  documentId: string,
): Promise<ActivityLog[] | null> {
  if (env.USE_MOCKS) return mockAuditStore.getDocumentHistory(documentId);

  try {
    const { data } = await api.get<BackendActivityLogResponse>("/activity-logs", {
      params: { document_id: documentId, limit: 100 },
    });
    return (data.data ?? []).map(mapActivityLog);
  } catch {
    return null;
  }
}

/** Ambil CSV export (string mentah) — di mock disusun dari localStorage. */
export async function fetchActivityLogsCsv(): Promise<string> {
  if (env.USE_MOCKS) return mockAuditStore.exportCsv();
  const { data } = await api.get<string>("/activity-logs/export", {
    responseType: "text",
    transformResponse: (v) => v,
  });
  return data;
}