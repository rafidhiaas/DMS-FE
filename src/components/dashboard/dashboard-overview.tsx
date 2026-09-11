"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FolderPlus, ScrollText, Share2, UploadCloud } from "lucide-react";
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
import { FileIcon } from "@/components/folders/file-icon";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { QuickUpload } from "@/components/dashboard/quick-upload";
import { RecentlyOpened, SavedViewPanels, SavedViewsHint } from "@/components/dashboard/dashboard-widgets";

const STATUS_ORDER: DocumentStatus[] = ["DRAFT", "PENDING_REVIEW", "APPROVED", "ARCHIVED"];

/** Warna segmen status (senada dengan stempel di STATUS_META). */
const STATUS_SWATCH: Record<DocumentStatus, string> = {
  DRAFT: "bg-muted-foreground/45",
  PENDING_REVIEW: "bg-warn",
  APPROVED: "bg-ok",
  ARCHIVED: "bg-rule",
};

/** Isi dashboard — konten menyesuaikan peran pengguna. */
export function DashboardOverview({
  role,
  firstName,
  roleLabel,
  dateLabel,
}: {
  role: Role;
  firstName: string;
  roleLabel: string;
  dateLabel: string;
}) {
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

  const figures = [
    {
      label: "Folder",
      value: stats.data ? formatCount(stats.data.folders) : null,
      href: "/folders",
    },
    {
      label: "Dokumen",
      value: stats.data ? formatCount(stats.data.documents) : null,
      href: "/folders",
    },
    {
      label: "Penyimpanan",
      value: stats.data
        ? stats.data.totalBytes === null
          ? "—"
          : formatBytes(stats.data.totalBytes)
        : null,
      href: "/folders",
    },
    {
      label: "Dibagikan ke saya",
      value: shared.data ? String(shared.data.length) : null,
      href: "/shared",
    },
  ];

  const totalActivity = (series.data ?? []).reduce((s, p) => s + p.count, 0);

  return (
    <QuickUpload enabled={canWrite}>
      {(openPicker) => (
        <div className="space-y-12">
      <PageHeader
        eyebrow={dateLabel}
        title={
          <>
            Selamat bekerja, {firstName}.
          </>
        }
        description={
          <>
            Anda masuk sebagai <span className="text-foreground">{roleLabel}</span>. Berikut
            keadaan arsip hari ini.
          </>
        }
        actions={
          <>
            {canWrite && (
              <>
                <button type="button" onClick={openPicker} className={buttonVariants({ size: "lg" })}>
                  <UploadCloud />
                  Unggah dokumen
                </button>
                <Link
                  href="/folders"
                  className={buttonVariants({ variant: "outline", size: "lg" })}
                >
                  <FolderPlus />
                  Folder baru
                </Link>
              </>
            )}
            {!canWrite && (
              <Link href="/shared" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <Share2 />
                Dibagikan ke saya
              </Link>
            )}
            {canSeeAudit && (
              <Link href="/audit" className={buttonVariants({ variant: "ghost", size: "lg" })}>
                <ScrollText />
                Audit log
              </Link>
            )}
          </>
        }
      />

      {/* Angka ringkasan: satu baris "buku besar", tanpa kartu dan ikon. */}
      <section
        aria-label="Ringkasan"
        className="rise-2 grid grid-cols-2 border-y border-rule sm:grid-cols-4 sm:divide-x sm:divide-rule"
      >
        {figures.map((f, i) => (
          <Link
            key={f.label}
            href={f.href}
            className={cn(
              "group flex flex-col gap-3 py-5 pr-4 transition-colors hover:bg-accent/60",
              i > 0 && "sm:pl-6",
              i % 2 === 1 && "pl-6 sm:pl-6",
              i >= 2 && "border-t border-rule sm:border-t-0",
            )}
          >
            <span className="eyebrow flex items-center justify-between">
              {f.label}
              <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
            {f.value === null ? (
              <Skeleton className="h-10 w-16 rounded-sm" />
            ) : (
              <span className="figure text-[2.5rem] leading-none">{f.value}</span>
            )}
          </Link>
        ))}
      </section>

      {/* Panel Tampilan Tersimpan (pola dashboard Paperless) */}
      <SavedViewPanels />
      <SavedViewsHint />

      {/* Status dokumen + aktivitas 7 hari */}
      <div className="rise-3 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section aria-labelledby="status-heading">
          <SectionHeader
            title="Status dokumen"
            meta={stats.data?.byStatus ? `${sumStatus(stats.data.byStatus)} total` : undefined}
          />
          <div className="pt-4">
            {stats.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-2 rounded-sm" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 rounded-sm" />
                ))}
              </div>
            ) : !stats.data?.byStatus ? (
              <EmptyState
                title="Belum ada agregasi status."
                description="Menunggu endpoint agregasi di backend."
                className="border-t-0 py-2"
              />
            ) : (
              <StatusBreakdown byStatus={stats.data.byStatus} />
            )}
          </div>
        </section>

        <section aria-labelledby="activity-heading">
          <SectionHeader
            title="Aktivitas 7 hari terakhir"
            meta={
              series.data
                ? `${totalActivity} aksi${
                    role === "COMPANY_ADMIN" || role === "EMPLOYEE" ? " · milik Anda" : ""
                  }`
                : undefined
            }
          />
          <div className="pt-4">
            {series.isLoading ? (
              <Skeleton className="h-40 rounded-sm" />
            ) : (
              <ActivityChart points={series.data ?? []} />
            )}
          </div>
        </section>
      </div>

      {/* Antrian review (admin) / dokumen terbaru + aktivitas terbaru */}
      <div className="grid gap-12 lg:grid-cols-2">
        {isAdmin ? (
          <section>
            <SectionHeader
              title="Menunggu review"
              meta={pendingReview.data ? `${pendingReview.data.length} dokumen` : undefined}
              action={<MoreLink href="/folders">Semua dokumen</MoreLink>}
            />
            {pendingReview.isLoading ? (
              <DocListSkeleton />
            ) : !pendingReview.data ? (
              <EmptyState
                title="Belum tersedia."
                description="Menunggu endpoint daftar dokumen per status di backend."
                className="border-t-0"
              />
            ) : pendingReview.data.length === 0 ? (
              <EmptyState
                title="Tidak ada yang menunggu review."
                description="Semua dokumen sudah ditindaklanjuti."
                className="border-t-0"
              />
            ) : (
              <div className="ledger">
                {pendingReview.data.map((doc) => (
                  <DocRow key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <SectionHeader
              title="Dokumen terbaru"
              action={<MoreLink href="/folders">Semua dokumen</MoreLink>}
            />
            {recentDocs.isLoading ? (
              <DocListSkeleton />
            ) : (recentDocs.data?.length ?? 0) === 0 ? (
              <EmptyState
                title="Belum ada dokumen."
                description="Dokumen yang Anda unggah akan muncul di sini."
                className="border-t-0"
              />
            ) : (
              <div className="ledger">
                {recentDocs.data!.map((doc) => (
                  <DocRow key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </section>
        )}

        <RecentlyOpened />

        <section className="lg:col-span-2">
          <SectionHeader
            title="Aktivitas terbaru"
            action={canSeeAudit ? <MoreLink href="/audit">Audit log</MoreLink> : undefined}
          />
          {activity.isLoading ? (
            <DocListSkeleton />
          ) : (activity.data?.logs.length ?? 0) === 0 ? (
            <EmptyState
              title="Belum ada aktivitas tercatat."
              className="border-t-0"
            />
          ) : (
            <div className="ledger">
              {activity.data!.logs.map((log) => {
                const meta = actionMeta(log.action);
                return (
                  <div key={log.id} className="flex items-start gap-4 py-3">
                    <Badge variant="secondary" className={cn(meta.className, "mt-0.5 shrink-0")}>
                      {meta.label}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px]" title={log.details}>
                        {log.details}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {log.user?.name ?? "—"} · {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
        </div>
      )}
    </QuickUpload>
  );
}

/* ------------------------------ subkomponen ------------------------------ */

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
    >
      {children}
      <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
    </Link>
  );
}

function sumStatus(byStatus: Record<DocumentStatus, number>) {
  return STATUS_ORDER.reduce((sum, s) => sum + byStatus[s], 0);
}

function StatusBreakdown({ byStatus }: { byStatus: Record<DocumentStatus, number> }) {
  const total = sumStatus(byStatus);
  return (
    <div>
      {/* Satu batang bertumpuk, bukan empat progress bar terpisah. */}
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-muted">
        {total > 0 &&
          STATUS_ORDER.map((s) =>
            byStatus[s] > 0 ? (
              <div
                key={s}
                className={cn("h-full transition-[width]", STATUS_SWATCH[s])}
                style={{ width: `${(byStatus[s] / total) * 100}%` }}
                title={`${STATUS_META[s].label}: ${byStatus[s]}`}
              />
            ) : null,
          )}
      </div>

      <div className="ledger mt-3">
        {STATUS_ORDER.map((s) => {
          const count = byStatus[s];
          const pct = total === 0 ? 0 : Math.round((count / total) * 100);
          return (
            <div key={s} className="flex items-center gap-3 py-2 text-[14px]">
              <span className={cn("size-2 shrink-0 rounded-[2px]", STATUS_SWATCH[s])} />
              <span className="flex-1">{STATUS_META[s].label}</span>
              <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                {pct}%
              </span>
              <span className="w-8 text-right font-mono text-[13px] tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>
      {total === 0 && (
        <p className="pt-2 text-[13px] text-muted-foreground">Belum ada dokumen.</p>
      )}
    </div>
  );
}

function ActivityChart({ points }: { points: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="flex h-40 items-end gap-3 border-b border-rule pb-6">
      {points.map((p) => {
        const d = new Date(p.date);
        const day = d.toLocaleDateString("id-ID", { weekday: "short" });
        const date = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        return (
          <div
            key={p.date}
            className="group relative flex h-full flex-1 flex-col items-stretch justify-end gap-2"
            title={`${date}: ${p.count} aktivitas`}
          >
            <span className="text-center font-mono text-[11px] tabular-nums text-muted-foreground">
              {p.count}
            </span>
            <div
              className={cn(
                "w-full rounded-[2px] transition-colors",
                p.count === 0 ? "bg-muted" : "bg-primary/80 group-hover:bg-primary",
              )}
              style={{ height: `${Math.max(3, (p.count / max) * 100)}%` }}
            />
            <span className="absolute -bottom-6 left-0 right-0 text-center font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              {day}
            </span>
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
      className="-mx-2 flex items-center gap-4 rounded-sm px-2 py-3 transition-colors hover:bg-accent/60"
    >
      <FileIcon extension={doc.extension} className="size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">{doc.title}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          v{doc.current_version} · {formatDate(doc.updated_at)}
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
    <div className="space-y-3 pt-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-sm" />
      ))}
    </div>
  );
}

function formatCount(n: number | null): string {
  return n === null ? "—" : String(n);
}
