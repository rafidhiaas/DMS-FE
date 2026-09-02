import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { peekDocuments, peekFolders } from "@/lib/mocks/dms-store";
import { mockAuditStore } from "@/lib/mocks/audit-store";
import { fetchActivityLogs } from "@/lib/api/activity-logs";
import type { DocumentItem, DocumentStatus, FolderContents } from "@/types";

/**
 * Statistik ringkas untuk dashboard.
 * CATATAN GAP BACKEND: Express belum punya endpoint statistik/agregasi maupun
 * "list dokumen per status", jadi mode non-mock hanya bisa best-effort;
 * nilai `null` berarti "tidak tersedia" dan panel terkait disembunyikan/dirender "—".
 */
export interface DmsStats {
  folders: number | null;
  documents: number | null;
  totalBytes: number | null;
  /** Jumlah dokumen per status siklus hidup (null = data tidak tersedia). */
  byStatus: Record<DocumentStatus, number> | null;
}

export async function fetchDmsStats(): Promise<DmsStats> {
  if (env.USE_MOCKS) {
    const folders = peekFolders();
    const docs = peekDocuments();
    const byStatus: Record<DocumentStatus, number> = {
      DRAFT: 0,
      PENDING_REVIEW: 0,
      APPROVED: 0,
      ARCHIVED: 0,
    };
    for (const d of docs) byStatus[d.status] += 1;
    return {
      folders: folders.length,
      documents: docs.length,
      totalBytes: docs.reduce((sum, d) => sum + Number(d.size_bytes), 0),
      byStatus,
    };
  }
  const { data } = await api.get<FolderContents>("/folders/root");
  return {
    folders: data.subFolders.length,
    documents: null,
    totalBytes: null,
    byStatus: null,
  };
}

/** Dokumen terbaru (mock: seluruh store; non-mock: belum tersedia tanpa endpoint agregasi). */
export async function fetchRecentDocuments(limit = 5): Promise<DocumentItem[]> {
  if (!env.USE_MOCKS) return [];
  return [...peekDocuments()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

/** Antrian dokumen berstatus Menunggu Review (null = tidak tersedia di mode backend). */
export async function fetchPendingReview(limit = 5): Promise<DocumentItem[] | null> {
  if (!env.USE_MOCKS) return null;
  return [...peekDocuments()]
    .filter((d) => d.status === "PENDING_REVIEW")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

export interface ActivityPoint {
  date: string;
  count: number;
}

/** Jumlah aktivitas per hari, N hari terakhir (non-mock: bucket dari halaman log pertama). */
export async function fetchActivitySeries(days = 7): Promise<ActivityPoint[]> {
  if (env.USE_MOCKS) return mockAuditStore.getSeries(days);

  const { logs } = await fetchActivityLogs({ page: 1, limit: 100 });
  const series: ActivityPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    series.push({
      date: d.toISOString(),
      count: logs.filter((l) => new Date(l.created_at).toDateString() === key).length,
    });
  }
  return series;
}
