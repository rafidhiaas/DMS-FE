import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockAuditStore } from "@/lib/mocks/audit-store";
import type { ActivityLog, ActivityLogPage } from "@/types";

/** Lapisan akses data Audit Log (mock ↔ backend Express /api/activity-logs). */

export async function fetchActivityLogs(input: {
  action?: string;
  page: number;
  limit: number;
}): Promise<ActivityLogPage> {
  if (env.USE_MOCKS) return mockAuditStore.getLogs(input);
  const { data } = await api.get<ActivityLogPage>("/activity-logs", {
    params: {
      page: input.page,
      limit: input.limit,
      ...(input.action ? { action: input.action } : {}),
    },
  });
  return data;
}

/**
 * Riwayat aktivitas satu dokumen (tab "Riwayat" di halaman detail).
 * Backend belum punya kolom document_id di ActivityLog maupun endpoint-nya,
 * jadi di mode backend kita kembalikan `null` agar UI menampilkan teks fallback.
 */
export async function fetchDocumentHistory(documentId: string): Promise<ActivityLog[] | null> {
  if (env.USE_MOCKS) return mockAuditStore.getDocumentHistory(documentId);
  return null;
}

/** Ambil CSV export (string mentah) — di mock disusun dari localStorage. */
export async function fetchActivityLogsCsv(): Promise<string> {
  if (env.USE_MOCKS) return mockAuditStore.exportCsv();
  const { data } = await api.get<string>("/activity-logs/export", {
    responseType: "text",
    transformResponse: (v) => v, // jangan parse sebagai JSON
  });
  return data;
}
