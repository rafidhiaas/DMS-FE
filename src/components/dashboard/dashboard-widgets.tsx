"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Bookmark, Clock, X } from "lucide-react";
import { useFolderContents } from "@/hooks/use-folders";
import { useAllDocuments } from "@/hooks/use-documents";
import { applyDocumentFilters } from "@/lib/list-filters";
import { useSavedViews, savedViewHref, type SavedView } from "@/lib/saved-views";
import { useRecentDocuments } from "@/lib/recent-docs";
import { formatDate, formatDateTime, STATUS_META } from "@/lib/format";
import type { DocumentItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon } from "@/components/folders/file-icon";
import { SectionHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

const LIMIT = 5;

/** Panel-panel Tampilan Tersimpan di dashboard (pola "saved views on dashboard" Paperless). */
export function SavedViewPanels() {
  const { views, remove } = useSavedViews();
  const items = views.filter((v) => v.showOnDashboard);
  if (items.length === 0) return null;

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      {items.map((v) => (
        <SavedViewPanel
          key={v.id}
          view={v}
          onRemove={() => {
            remove(v.id);
            toast.success(`Tampilan “${v.name}” dihapus.`);
          }}
        />
      ))}
    </div>
  );
}

function SavedViewPanel({ view, onRemove }: { view: SavedView; onRemove: () => void }) {
  const isGlobal = view.folderId === "all";
  const folderContents = useFolderContents(isGlobal ? "root" : view.folderId);
  const allDocs = useAllDocuments(isGlobal);
  const contents = isGlobal
    ? { data: allDocs.data ? { documents: allDocs.data } : undefined, isLoading: allDocs.isLoading, isError: allDocs.isError }
    : folderContents;
  const docs = contents.data ? applyDocumentFilters(contents.data.documents, view.filters) : [];
  const shown = docs.slice(0, LIMIT);

  return (
    <section aria-label={`Tampilan tersimpan ${view.name}`}>
      <SectionHeader
        title={view.name}
        meta={contents.data ? `${docs.length} dokumen · ${view.folderName}` : view.folderName}
        action={
          <span className="flex items-center gap-2">
            <Link
              href={savedViewHref(view)}
              className="group inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
            >
              Buka
              <ArrowUpRight className="size-3 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="size-6 text-muted-foreground hover:text-destructive"
              aria-label={`Hapus tampilan ${view.name}`}
              title="Hapus tampilan tersimpan"
              onClick={onRemove}
            >
              <X className="size-3.5" />
            </Button>
          </span>
        }
      />
      {contents.isLoading ? (
        <ListSkeleton />
      ) : contents.isError ? (
        <EmptyState
          tone="destructive"
          title="Folder tidak dapat dimuat."
          description="Folder mungkin sudah dihapus. Hapus tampilan ini bila tidak diperlukan."
          className="border-t-0"
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title="Tidak ada dokumen yang cocok."
          description="Filter tampilan ini belum menemukan dokumen."
          className="border-t-0"
        />
      ) : (
        <div className="ledger">
          {shown.map((doc) => (
            <DocRow key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Widget "Terakhir dibuka" — jejak lokal browser, tersedia untuk semua peran. */
export function RecentlyOpened() {
  const recent = useRecentDocuments();
  return (
    <section aria-labelledby="recent-heading">
      <SectionHeader title="Terakhir dibuka" meta={recent.length ? `${recent.length} dokumen` : undefined} />
      {recent.length === 0 ? (
        <EmptyState
          title="Belum ada yang dibuka."
          description="Dokumen yang Anda buka akan tercatat di sini untuk akses cepat."
          className="border-t-0"
        />
      ) : (
        <div className="ledger">
          {recent.slice(0, LIMIT).map((d) => (
            <Link
              key={d.id}
              href={`/documents/${d.id}`}
              className="-mx-2 flex items-center gap-4 rounded-sm px-2 py-3 transition-colors hover:bg-accent/60"
            >
              <FileIcon extension={d.extension} className="size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{d.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{d.folder_name}</p>
              </div>
              <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                <Clock className="size-3" />
                {formatDateTime(d.opened_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/** Ajakan membuat tampilan pertama — tampil bila belum ada satu pun. */
export function SavedViewsHint() {
  const { views } = useSavedViews();
  if (views.length > 0) return null;
  return (
    <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <Bookmark className="size-3.5" />
      Tip: simpan filter folder sebagai <span className="text-foreground">Tampilan tersimpan</span> untuk
      memunculkan panelnya di sini dan di sidebar.
    </p>
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

function ListSkeleton() {
  return (
    <div className="space-y-3 pt-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 rounded-sm" />
      ))}
    </div>
  );
}
