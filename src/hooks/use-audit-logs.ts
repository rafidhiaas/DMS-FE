"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import * as activityLogsApi from "@/lib/api/activity-logs";

export const auditKeys = {
  logs: (action: string, page: number, limit: number) =>
    ["activity-logs", { action, page, limit }] as const,
  documentHistory: (documentId: string) => ["document-history", documentId] as const,
};

export function useActivityLogs(input: { action?: string; page: number; limit: number }) {
  return useQuery({
    queryKey: auditKeys.logs(input.action ?? "", input.page, input.limit),
    queryFn: () => activityLogsApi.fetchActivityLogs(input),
    // Tahan data lama saat pindah halaman agar tabel tidak berkedip.
    placeholderData: keepPreviousData,
  });
}

/** Riwayat aktivitas satu dokumen (tab "Riwayat"). */
export function useDocumentHistory(documentId: string, enabled = true) {
  return useQuery({
    queryKey: auditKeys.documentHistory(documentId),
    queryFn: () => activityLogsApi.fetchDocumentHistory(documentId),
    enabled,
  });
}
