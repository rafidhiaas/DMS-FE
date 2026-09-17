import { api } from "@/lib/api/client";
import type { DocumentItem, DocumentStatus } from "@/types";
import { mapDocument, unwrap, type BeDocument } from "@/lib/api/_transform";

/**
 * Statistik dashboard → backend `GET /stats/dashboard` (satu request, dibatasi ke
 * data yang boleh dilihat user). Fungsi-fungsi di bawah berbagi hasil request yang sama.
 */
export interface DmsStats {
  folders: number | null;
  documents: number | null;
  totalBytes: number | null;
  /** Jumlah dokumen per status siklus hidup. */
  byStatus: Record<DocumentStatus, number> | null;
  byTag: Array<{ id: string; name: string; color?: string; count: number }> | null;
  byType: Array<{ id: string; name: string; count: number }> | null;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

interface BeDashboard {
  folders: number;
  documents: number;
  totalBytes: string | number;
  byStatus: Record<DocumentStatus, number>;
  byTag: Array<{ id: string; name: string; color?: string; count: number }>;
  byType: Array<{ id: string; name: string; count: number }>;
  recentDocuments: BeDocument[];
  /** null untuk non-admin (antrian review hanya relevan bagi admin). */
  pendingReview: BeDocument[] | null;
  activitySeries: ActivityPoint[];
}

// Dashboard memanggil 4 fungsi sekaligus → satukan ke satu request yang sedang berjalan.
let inflight: { days: number; at: number; promise: Promise<BeDashboard> } | null = null;

function fetchDashboard(days = 7): Promise<BeDashboard> {
  const now = Date.now();
  if (inflight && inflight.days === days && now - inflight.at < 2_000) return inflight.promise;
  const promise = api
    .get<unknown>("/stats/dashboard", { params: { days } })
    .then(({ data }) => unwrap<BeDashboard>(data));
  inflight = { days, at: now, promise };
  promise.catch(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  return promise;
}

export async function fetchDmsStats(): Promise<DmsStats> {
  const d = await fetchDashboard();
  return {
    folders: d.folders,
    documents: d.documents,
    totalBytes: Number(d.totalBytes ?? 0),
    byStatus: d.byStatus,
    byTag: d.byTag,
    byType: d.byType,
  };
}

/** Dokumen terbaru yang boleh dilihat user. */
export async function fetchRecentDocuments(limit = 5): Promise<DocumentItem[]> {
  const d = await fetchDashboard();
  return d.recentDocuments.slice(0, limit).map(mapDocument) as DocumentItem[];
}

/** Antrian dokumen berstatus Menunggu Review (null = bukan admin). */
export async function fetchPendingReview(limit = 5): Promise<DocumentItem[] | null> {
  const d = await fetchDashboard();
  if (!d.pendingReview) return null;
  return d.pendingReview.slice(0, limit).map(mapDocument) as DocumentItem[];
}

/** Jumlah aktivitas per hari, N hari terakhir. */
export async function fetchActivitySeries(days = 7): Promise<ActivityPoint[]> {
  return (await fetchDashboard(days)).activitySeries;
}