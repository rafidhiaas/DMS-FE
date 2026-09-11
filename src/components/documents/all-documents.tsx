"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useAllDocuments, useRenameDocument, useDeleteDocument, useMoveDocument, useBulkSetStatus } from "@/hooks/use-documents";
import { useLocalPref } from "@/hooks/use-local-pref";
import { getSavedView, useSavedViews } from "@/lib/saved-views";
import { downloadDocument, downloadToast } from "@/lib/download";
import { applyDocumentFilters, EMPTY_FILTERS, extensionsIn, hasActiveFilters, VIEW_MODES, type ListFilters, type ViewMode } from "@/lib/list-filters";
import type { DocumentStatus, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { FolderToolbar } from "@/components/folders/folder-toolbar";
import { DocumentTable, type ItemHandlers } from "@/components/folders/document-table";
import { BulkActionBar } from "@/components/folders/bulk-action-bar";
import { DocumentCard, DocumentCardLarge } from "@/components/folders/document-cards";
import { MoveDialog } from "@/components/folders/move-dialog";
import { SaveViewDialog } from "@/components/folders/save-view-dialog";
import { BulkMetadataDialog } from "@/components/folders/edit-metadata-dialog";
import { RenameDialog, DeleteConfirmDialog } from "@/components/folders/folder-dialogs";

export const ALL_DOCUMENTS_VIEW_ID = "all";
const VIEW_PREF_KEY = "dms_folder_view";

/**
 * Halaman "Semua Dokumen" — daftar lintas folder ala halaman Documents Paperless:
 * filter metadata & tanggal, tampilan kartu/tabel, aksi massal, Tampilan Tersimpan global.
 */
export function AllDocuments({ role }: { role: Role }) {
  const router = useRouter();
  const canWrite = role !== "AUDITOR";
  const canDelete = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
  const isAdmin = canDelete;

  const searchParams = useSearchParams();
  const requestedViewId = searchParams.get("view");
  const savedViews = useSavedViews();
  const activeView =
    savedViews.views.find((v) => v.id === requestedViewId && v.folderId === ALL_DOCUMENTS_VIEW_ID) ?? null;

  const docsQuery = useAllDocuments();
  const renameDocument = useRenameDocument();
  const deleteDocument = useDeleteDocument();
  const moveDocument = useMoveDocument();
  const bulkStatus = useBulkSetStatus();

  const [filters, setFilters] = useState<ListFilters>(() => {
    const v = getSavedView(requestedViewId);
    return v && v.folderId === ALL_DOCUMENTS_VIEW_ID ? v.filters : { ...EMPTY_FILTERS, sort: "updated" };
  });
  const [prefView, setPrefView] = useLocalPref<ViewMode>(VIEW_PREF_KEY, "table", VIEW_MODES);
  const [viewOverride, setViewOverride] = useState<ViewMode | null>(() => {
    const v = getSavedView(requestedViewId);
    return v && v.folderId === ALL_DOCUMENTS_VIEW_ID ? v.view : null;
  });
  const view = viewOverride ?? prefView;

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; name?: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ ids: string[]; name?: string } | null>(null);
  const [bulkMetaOpen, setBulkMetaOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);

  const allDocs = docsQuery.data ?? [];
  const docs = applyDocumentFilters(allDocs, filters);
  const docIds = new Set(allDocs.map((d) => d.id));
  const selectedIds = Array.from(selected).filter((id) => docIds.has(id));
  const selectedSet = new Set(selectedIds);
  const filtering = hasActiveFilters(filters);

  /* ------------------------------ seleksi ------------------------------ */

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllVisible() {
    const visible = docs.map((d) => d.id);
    const allOn = visible.length > 0 && visible.every((id) => selectedSet.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of visible) {
        if (allOn) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }
  const clearSelection = () => setSelected(new Set());

  /* ------------------------------ handlers ----------------------------- */

  const handlers: ItemHandlers = {
    onOpen: (kind, id) => router.push(kind === "folder" ? `/folders/${id}` : `/documents/${id}`),
    onRename: (_kind, id, name) => setRenameTarget({ id, name }),
    onMove: (_kind, id, name) => setMoveTarget({ ids: [id], name }),
    onDelete: (_kind, id, name) => setDeleteTarget({ ids: [id], name }),
  };

  function handleRename(value: string) {
    if (!renameTarget) return;
    renameDocument.mutate(
      { id: renameTarget.id, title: value },
      {
        onSuccess: () => {
          toast.success("Judul diperbarui.");
          setRenameTarget(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  async function runSequential(ids: string[], fn: (id: string) => Promise<unknown>, label: string) {
    setBusy(true);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await fn(id);
        ok += 1;
      } catch (e) {
        failed += 1;
        if (ids.length === 1) toast.error(e instanceof Error ? e.message : "Gagal.");
      }
    }
    setBusy(false);
    if (ok > 0) toast.success(failed === 0 ? `${ok} dokumen ${label}.` : `${ok} ${label}, ${failed} gagal.`);
    return ok;
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const ok = await runSequential(deleteTarget.ids, (id) => deleteDocument.mutateAsync(id), "dipindahkan ke Sampah");
    if (ok > 0) {
      setDeleteTarget(null);
      clearSelection();
    }
  }

  async function handleMove(folderId: string | null) {
    if (!moveTarget || !folderId) return;
    const ok = await runSequential(
      moveTarget.ids,
      (id) => moveDocument.mutateAsync({ id, folder_id: folderId }),
      "dipindahkan",
    );
    if (ok > 0) {
      setMoveTarget(null);
      clearSelection();
    }
  }

  async function handleBulkDownload() {
    setBusy(true);
    let ok = 0;
    for (const id of selectedIds) {
      const d = allDocs.find((x) => x.id === id);
      if (!d) continue;
      try {
        const result = await downloadDocument({ id: d.id, title: d.title, extension: d.extension, current_version: d.current_version });
        if (selectedIds.length === 1) toast.success(downloadToast(result));
        ok += 1;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mengunduh.");
        break;
      }
    }
    setBusy(false);
    if (ok > 1) toast.success(`${ok} berkas diunduh.`);
  }

  function handleBulkStatus(status: DocumentStatus) {
    bulkStatus.mutate(
      { ids: selectedIds, status },
      {
        onSuccess: ({ changed, skipped }) => {
          if (changed > 0) toast.success(`${changed} dokumen diubah statusnya.`);
          if (skipped > 0) toast.warning(`${skipped} dokumen dilewati (transisi status tidak sah).`);
          clearSelection();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleSaveView(input: { name: string; showInSidebar: boolean; showOnDashboard: boolean }) {
    const created = savedViews.add({
      ...input,
      folderId: ALL_DOCUMENTS_VIEW_ID,
      folderName: "Semua dokumen",
      filters,
      view,
    });
    setSaveViewOpen(false);
    toast.success(`Tampilan “${created.name}” disimpan.`);
    router.replace(`/documents?view=${created.id}`);
  }

  /* ------------------------------- render ------------------------------ */

  const isEmpty = docsQuery.data && allDocs.length === 0;
  const noMatch = docsQuery.data && !isEmpty && docs.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        eyebrow="Arsip"
        title="Semua Dokumen"
        description="Seluruh dokumen dari semua folder. Saring dengan status, format, tag, tipe, pihak, dan tanggal."
      />

      {docsQuery.data && !isEmpty &&
        (selectedIds.length > 0 ? (
          <BulkActionBar
            count={selectedIds.length}
            total={allDocs.length}
            canWrite={canWrite}
            canDelete={canDelete}
            busy={busy || bulkStatus.isPending}
            onSelectAll={() => setSelected(new Set(allDocs.map((d) => d.id)))}
            onClear={clearSelection}
            onDownload={handleBulkDownload}
            onMove={() => setMoveTarget({ ids: selectedIds })}
            onEditMeta={() => setBulkMetaOpen(true)}
            onDelete={() => setDeleteTarget({ ids: selectedIds })}
            onSetStatus={isAdmin ? handleBulkStatus : undefined}
          />
        ) : (
          <FolderToolbar
            filters={filters}
            onChange={setFilters}
            availableExtensions={extensionsIn(allDocs)}
            view={view}
            onViewChange={(v) => {
              setViewOverride(null);
              setPrefView(v);
            }}
            total={allDocs.length}
            shown={docs.length}
            showDateFilter
            searchPlaceholder="Cari judul di semua folder…"
            activeViewName={activeView?.name ?? null}
            onSaveView={() => setSaveViewOpen(true)}
            onClearView={activeView ? () => router.replace("/documents") : undefined}
          />
        ))}

      {docsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : docsQuery.isError ? (
        <EmptyState tone="destructive" title="Gagal memuat dokumen" description="Coba muat ulang halaman." />
      ) : isEmpty ? (
        <EmptyState title="Belum ada dokumen" description="Unggah dokumen dari halaman folder atau dashboard." />
      ) : noMatch ? (
        <EmptyState
          title="Tidak ada yang cocok"
          description="Ubah kata kunci atau lepas filter untuk melihat dokumen lain."
          action={
            <Button variant="outline" size="sm" onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}>
              Reset filter
            </Button>
          }
        />
      ) : view === "table" ? (
        <DocumentTable
          folders={[]}
          documents={docs}
          canWrite={canWrite}
          canDelete={canDelete}
          selectable
          selected={selectedSet}
          onToggle={toggleSelect}
          onToggleAll={toggleAllVisible}
          handlers={handlers}
          showFolder
        />
      ) : view === "large" ? (
        <div className="space-y-3">
          {docs.map((doc) => (
            <DocumentCardLarge
              key={doc.id}
              doc={doc}
              canWrite={canWrite}
              canDelete={canDelete}
              selectable
              selected={selectedSet.has(doc.id)}
              anySelected={selectedIds.length > 0}
              onToggle={() => toggleSelect(doc.id)}
              onOpen={() => handlers.onOpen("document", doc.id)}
              onRename={() => handlers.onRename("document", doc.id, doc.title)}
              onMove={() => handlers.onMove("document", doc.id, doc.title)}
              onDelete={() => handlers.onDelete("document", doc.id, doc.title)}
              folderName={doc.folder_name}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              canWrite={canWrite}
              canDelete={canDelete}
              selectable
              selected={selectedSet.has(doc.id)}
              anySelected={selectedIds.length > 0}
              onToggle={() => toggleSelect(doc.id)}
              onOpen={() => handlers.onOpen("document", doc.id)}
              onRename={() => handlers.onRename("document", doc.id, doc.title)}
              onMove={() => handlers.onMove("document", doc.id, doc.title)}
              onDelete={() => handlers.onDelete("document", doc.id, doc.title)}
              folderName={doc.folder_name}
            />
          ))}
        </div>
      )}

      {filtering && !noMatch && docsQuery.data && !isEmpty && (
        <p className="font-mono text-[11px] text-muted-foreground">Filter aktif — hanya menampilkan dokumen yang cocok.</p>
      )}

      {/* Dialogs */}
      <RenameDialog
        key={`rn-${renameTarget?.id ?? "none"}`}
        open={renameTarget !== null}
        onOpenChange={(v) => !v && setRenameTarget(null)}
        title="Ganti Judul Dokumen"
        label="Judul dokumen"
        initialValue={renameTarget?.name ?? ""}
        onSubmit={handleRename}
        pending={renameDocument.isPending}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && !busy && setDeleteTarget(null)}
        title={deleteTarget && deleteTarget.ids.length > 1 ? `Hapus ${deleteTarget.ids.length} dokumen?` : "Hapus dokumen?"}
        description={
          deleteTarget && deleteTarget.ids.length > 1
            ? "Semua dokumen terpilih dipindahkan ke Sampah dan dapat dipulihkan selama 30 hari."
            : `Dokumen "${deleteTarget?.name ?? ""}" dipindahkan ke Sampah dan dapat dipulihkan selama 30 hari.`
        }
        onConfirm={handleDelete}
        pending={busy || deleteDocument.isPending}
      />
      <MoveDialog
        key={`mv-${moveTarget ? moveTarget.ids.join(",") : "none"}`}
        open={moveTarget !== null}
        onOpenChange={(v) => !v && !busy && setMoveTarget(null)}
        title={moveTarget && moveTarget.ids.length > 1 ? `Pindahkan ${moveTarget.ids.length} dokumen` : `Pindahkan “${moveTarget?.name ?? ""}”`}
        description="Pilih folder tujuan. Dokumen harus berada di dalam sebuah folder."
        currentFolderId={moveTarget && moveTarget.ids.length === 1 ? (allDocs.find((d) => d.id === moveTarget.ids[0])?.folder_id ?? null) : null}
        allowRoot={false}
        onSubmit={handleMove}
        pending={busy || moveDocument.isPending}
      />
      <BulkMetadataDialog
        key={`bm-${bulkMetaOpen}`}
        documents={allDocs.filter((d) => selectedSet.has(d.id))}
        open={bulkMetaOpen}
        onOpenChange={setBulkMetaOpen}
        onDone={clearSelection}
      />
      <SaveViewDialog
        key={`sv-${saveViewOpen}`}
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        folderName="Semua dokumen"
        filters={filters}
        view={view}
        onSubmit={handleSaveView}
      />
    </div>
  );
}
