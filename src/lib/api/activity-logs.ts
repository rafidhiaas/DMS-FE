import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockAuditStore } from "@/lib/mocks/audit-store";
import type { ActivityLogPage } from "@/types";

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

/** Ambil CSV export (string mentah) — di mock disusun dari localStorage. */
export async function fetchActivityLogsCsv(): Promise<string> {
  if (env.USE_MOCKS) return mockAuditStore.exportCsv();
  const { data } = await api.get<string>("/activity-logs/export", {
    responseType: "text",
    transformResponse: (v) => v, // jangan parse sebagai JSON
  });
  return data;
}
