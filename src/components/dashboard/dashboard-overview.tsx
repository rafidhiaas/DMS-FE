"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FolderTree,
  FolderPlus,
  FileText,
  HardDrive,
  Share2,
  ArrowRight,
  ScrollText,
  UploadCloud,
  ClipboardCheck,
  BarChart3,
  CircleDashed,
} from "lucide-react";
import {
  fetchDmsStats,
  fetchRecentDocuments,
  fetchPendingReview,
  fetchActivitySeries,
} from "@/lib/api/stats";
import { useSharedWithMe } from "@/hooks/use-shares";
import { useActivityLogs } from "@/hooks/use-audit-logs";
import {
  formatBytes,
  formatDateTime,
  formatDate,
  actionMeta,
  STATUS_META,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DocumentItem, DocumentStatus, Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileIcon } from "@/components/folders/file-icon";

const STATUS_ORDER: DocumentStatus[] = ["DRAFT", "PENDING_REVIEW", "APPROVED", "ARCHIVED"];

/** Warna batang panel status (senada dengan STATUS_META badge). */
const STATUS_BAR_CLASS: Record<DocumentStatus, string> = {
  DRAFT: "bg-slate-400 dark:bg-slate-500",
  PENDING_REVIEW: "bg-amber-500",
  APPROVED: "bg-emerald-500",
  ARCHIVED: "bg-slate-300 dark:bg-slate-600",
};

/** Isi dashboard — konten menyesuaikan peran pengguna. */
export function DashboardOverview({ role }: { role: Role }) {
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const canWrite = role !== "AUDITOR";
  const canSeeAudit = role !== "EMPLOYEE";

  const stats = useQuery({ queryKey: ["dms-stats"], queryFn: fetchDmsStats });
  const recentDocs = useQuery({
    queryKey: ["recent-documents"],
    queryFn: () => fetchRecentDocuments(5),
    enabled: !isAdmin,
  });
  const pendingReview = useQuery({
    queryKey: ["pending-review"],
    queryFn: () => fetchPendingReview(5),
    enabled: isAdmin,
  });
  const series = useQuery({
    queryKey: ["activity-series"],
    queryFn: () => fetchActivitySeries(7),
  });
  const shared = useSharedWithMe();
  const activity = useActivityLogs({ page: 1, limit: 5 });

  const statCards = [
    {
      label: "Total Folder",
      value: stats.data ? formatCount(stats.data.folders) : null,
      icon: FolderTree,
      href: "/folders",
    },
    {
      label: "Total Dokumen",
      value: stats.data ? formatCount(stats.data.documents) : null,
      icon: FileText,
      href: "/folders",
    },
    {
      label: "Total Penyimpanan",
      value: stats.data
        ? stats.data.totalBytes === null
          ? "—"
          : formatBytes(stats.data.totalBytes)
        : null,
      icon: HardDrive,
      href: "/folders",
    },
    {
      label: "Dibagikan ke Saya",
      value: shared.data ? String(shared.data.length) : null,
      icon: Share2,
      href: "/shared",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        {canWrite && (
          <>
            <Link href="/folders" className={buttonVariants()}>
              <UploadCloud className="size-4" />
              Unggah Dokumen
            </Link>
            <Link href="/folders" className={buttonVariants({ variant: "outline" })}>
              <FolderPlus className="size-4" />
              Buat Folder
            </Link>
          </>
        )}
        <Link href="/shared" className={buttonVariants({ variant: "outline" })}>
          <Share2 className="size-4" />
          Dibagikan ke Saya
        </Link>
        {canSeeAudit && (
          <Link href="/audit" className={buttonVariants({ variant: "outline" })}>
            <ScrollText className="size-4" />
            Audit Log
          </Link>
        )}
      </div>

      {/* Kartu statistik */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((c) => (
          <Link key={c.label} href={c.href} className="group">
            <Card className="transition-colors group-hover:border-primary/40">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <c.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  {c.value === null ? (
                    <Skeleton className="h-7 w-14" />
                  ) : (
                    <p className="text-2xl font-semibold tabular-nums">{c.value}</p>
                  )}
                  <p className="truncate text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Status dokumen + grafik aktivitas */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDashed className="size-4" />
              Status Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded-md" />
                ))}
              </div>
            ) : !stats.data?.byStatus ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Menunggu endpoint agregasi di backend.
              </p>
            ) : (
              <StatusBreakdown byStatus={stats.data.byStatus} />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4" />
              Aktivitas 7 Hari Terakhir
              {role === "COMPANY_ADMIN" || role === "EMPLOYEE" ? (
                <span className="text-xs font-normal text-muted-foreground">
                  (aktivitas Anda)
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {series.isLoading ? (
              <Skeleton className="h-36 rounded-md" />
            ) : (
              <ActivityChart points={series.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Baris bawah: antrian review (admin) / dokumen terbaru + aktivitas terbaru */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isAdmin ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardCheck className="size-4" />
                Antrian Menunggu Review
              </CardTitle>
              <Link
                href="/folders"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Semua <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingReview.isLoading ? (
                <DocListSkeleton />
              ) : !pendingReview.data ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Menunggu endpoint daftar dokumen per status di backend.
                </p>
              ) : pendingReview.data.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Tidak ada dokumen menunggu review. 🎉
                </p>
              ) : (
                pendingReview.data.map((doc) => <DocRow key={doc.id} doc={doc} />)
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" />
                Dokumen Terbaru
              </CardTitle>
              <Link
                href="/folders"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Semua <ArrowRight className="size-3.5" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDocs.isLoading ? (
                <DocListSkeleton />
              ) : (recentDocs.data?.length ?? 0) === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Belum ada dokumen.
                </p>
              ) : (
                recentDocs.data!.map((doc) => <DocRow key={doc.id} doc={doc} />)
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-4" />
              Aktivitas Terbaru
            </CardTitle>
            {canSeeAudit && (
              <Link
                href="/audit"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                Audit Log <ArrowRight className="size-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-lg" />
              ))
            ) : (activity.data?.logs.length ?? 0) === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Belum ada aktivitas tercatat.
              </p>
            ) : (
              activity.data!.logs.map((log) => {
                const meta = actionMeta(log.action);
                return (
                  <div key={log.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <Badge variant="secondary" className={`${meta.className} shrink-0`}>
                      {meta.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm" title={log.details}>
                        {log.details}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user?.name ?? "-"} · {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ subkomponen ------------------------------ */

function StatusBreakdown({ byStatus }: { byStatus: Record<DocumentStatus, number> }) {
  const total = STATUS_ORDER.reduce((sum, s) => sum + byStatus[s], 0);
  return (
    <div className="space-y-3">
      {STATUS_ORDER.map((s) => {
        const count = byStatus[s];
        const pct = total === 0 ? 0 : Math.round((count / total) * 100);
        return (
          <div key={s}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span>{STATUS_META[s].label}</span>
              <span className="tabular-nums text-muted-foreground">
                {count} · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", STATUS_BAR_CLASS[s])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {total === 0 && (
        <p className="pt-1 text-center text-xs text-muted-foreground">Belum ada dokumen.</p>
      )}
    </div>
  );
}

function ActivityChart({ points }: { points: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="flex h-36 items-end gap-2">
      {points.map((p) => {
        const d = new Date(p.date);
        const label = d.toLocaleDateString("id-ID", { weekday: "short" });
        return (
          <div
            key={p.date}
            className="group flex h-full flex-1 flex-col items-center justify-end gap-1"
            title={`${d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}: ${p.count} aktivitas`}
          >
            <span className="text-xs tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              {p.count}
            </span>
            <div
              className={cn(
                "w-full max-w-10 rounded-t-md transition-colors",
                p.count === 0
                  ? "bg-muted"
                  : "bg-primary/70 group-hover:bg-primary",
              )}
              style={{ height: `${Math.max(4, (p.count / max) * 100)}%` }}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function DocRow({ doc }: { doc: DocumentItem }) {
  const status = STATUS_META[doc.status];
  return (
    <Link
      href={`/documents/${doc.id}`}
      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-accent/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileIcon extension={doc.extension} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{doc.title}</p>
        <p className="text-xs text-muted-foreground">
          v{doc.current_version} · diperbarui {formatDate(doc.updated_at)}
        </p>
      </div>
      <Badge variant="secondary" className={status.className}>
        {status.label}
      </Badge>
    </Link>
  );
}

function DocListSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-14 rounded-lg" />
      ))}
    </>
  );
}

function formatCount(n: number | null): string {
  return n === null ? "—" : String(n);
}
