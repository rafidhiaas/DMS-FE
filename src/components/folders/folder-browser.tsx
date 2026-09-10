"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Folder as FolderIcon, FolderPlus, UploadCloud } from "lucide-react";
import {
  useFolderContents,
  useFolderPath,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
} from "@/hooks/use-folders";
import { useCreateDocument, useRenameDocument, useDeleteDocument } from "@/hooks/use-documents";
import { useLocalPref } from "@/hooks/use-local-pref";
import { downloadDocument } from "@/lib/download";
import { formatBytes, formatDate, STATUS_META } from "@/lib/format";
import {
  applyDocumentFilters,
  applyFolderFilters,
  EMPTY_FILTERS,
  extensionsIn,
  hasActiveFilters,
  VIEW_MODES,
  type ListFilters,
  type ViewMode,
} from "@/lib/list-filters";
import { cn } from "@/lib/utils";
import type { Role, Folder, DocumentItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/folders/breadcrumbs";
import { FileIcon } from "@/components/folders/file-icon";
import { ItemActionsMenu } from "@/components/folders/item-actions-menu";
import { FolderToolbar } from "@/components/folders/folder-toolbar";
import { DocumentTable, type ItemHandlers } from "@/components/folders/document-table";
import { BulkActionBar } from "@/components/folders/bulk-action-bar";
import {
  CreateFolderDialog,
  CreateDocumentDialog,
  RenameDialog,
  DeleteConfirmDialog,
} from "@/components/folders/folder-dialogs";

type Target = { kind: "folder" | "document"; id: string; name: string };
type DeleteTarget = Target | { kind: "bulk"; ids: string[] };

const VIEW_PREF_KEY = "dms_folder_view";

export function FolderBrowser({ folderId, role }: { folderId: string; role: Role }) {
  const router = useRouter();
  const isRoot = folderId === "root";

  const canWrite = role !== "AUDITOR";
  const canDelete = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  const contents = useFolderContents(folderId);
  const pathQuery = useFolderPath(folderId);

  const createFolder = useCreateFolder();
  const renameFolder = useRenameFolder();
  const deleteFolder = useDeleteFolder();
  const createDocument = useCreateDocument();
  const renameDocument = useRenameDocument();
  const deleteDocument = useDeleteDocument();

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Target | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [view, setView] = useLocalPref<ViewMode>(VIEW_PREF_KEY, "grid", VIEW_MODES);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  /* ------------------------------ derived ------------------------------ */

  const data = contents.data;
  const allFolders = data?.subFolders ?? [];
  const allDocs = data?.documents ?? [];
  const folders = applyFolderFilters(allFolders, filters);
  const docs = applyDocumentFilters(allDocs, filters);
  const availableExtensions = extensionsIn(allDocs);
  const filtering = hasActiveFilters(filters);

  // Seleksi hanya menghitung dokumen yang masih ada (aman setelah hapus/filter).
  const docIds = new Set(allDocs.map((d) => d.id));
  const selectedIds = Array.from(selected).filter((id) => docIds.has(id));
  const selectedSet = new Set(selectedIds);
  const selectable = allDocs.length > 0;

  /* ------------------------------ handlers ----------------------------- */

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

  function selectAll() {
    setSelected(new Set(allDocs.map((d) => d.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const handlers: ItemHandlers = {
    onOpen: (kind, id) => router.push(kind === "folder" ? `/folders/${id}` : `/documents/${id}`),
    onRename: (kind, id, name) => setRenameTarget({ kind, id, name }),
    onDelete: (kind, id, name) => setDeleteTarget({ kind, id, name }),
  };

  function handleCreateFolder(name: string) {
    createFolder.mutate(
      { name, parent_folder_id: isRoot ? null : folderId },
      {
        onSuccess: () => {
          toast.success(`Folder "${name}" dibuat.`);
          setCreateFolderOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleCreateDocument(input: { title: string; extension: string; size_bytes: number }) {
    createDocument.mutate(
      { ...input, folder_id: folderId },
      {
        onSuccess: () => {
          toast.success(`Dokumen "${input.title}" diunggah.`);
          setCreateDocOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleRename(value: string) {
    if (!renameTarget) return;
    const opts = {
      onSuccess: () => {
        toast.success("Nama diperbarui.");
        setRenameTarget(null);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (renameTarget.kind === "folder") renameFolder.mutate({ id: renameTarget.id, name: value }, opts);
    else renameDocument.mutate({ id: renameTarget.id, title: value }, opts);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "bulk") {
      setBulkBusy(true);
      let ok = 0;
      let failed = 0;
      for (const id of deleteTarget.ids) {
        try {
          await deleteDocument.mutateAsync(id);
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      setBulkBusy(false);
      setDeleteTarget(null);
      clearSelection();
      if (failed === 0) toast.success(`${ok} dokumen dihapus.`);
      else toast.warning(`${ok} dokumen dihapus, ${failed} gagal.`);
      return;
    }
    const opts = {
      onSuccess: () => {
        toast.success("Berhasil dihapus.");
        setDeleteTarget(null);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (deleteTarget.kind === "folder") deleteFolder.mutate(deleteTarget.id, opts);
    else deleteDocument.mutate(deleteTarget.id, opts);
  }

  async function handleBulkDownload() {
    setBulkBusy(true);
    let ok = 0;
    for (const id of selectedIds) {
      const d = allDocs.find((x) => x.id === id);
      if (!d) continue;
      try {
        await downloadDocument({
          id: d.id,
          title: d.title,
          extension: d.extension,
          current_version: d.current_version,
        });
        ok += 1;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mengunduh.");
        break;
      }
    }
    setBulkBusy(false);
    if (ok > 0) toast.success(`${ok} berkas simulasi diunduh (menunggu integrasi S3).`);
  }

  /* ------------------------------- render ------------------------------ */

  const isEmpty = data && allFolders.length === 0 && allDocs.length === 0;
  const noMatch = data && !isEmpty && folders.length === 0 && docs.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Kop halaman — seragam dengan halaman lain (PageHeader). */}
      <PageHeader
        eyebrow={isRoot ? "Arsip" : "Folder"}
        title={isRoot ? "Folder & Dokumen" : (pathQuery.data?.at(-1)?.name ?? "Memuat…")}
        description={
          isRoot
            ? "Dokumen disimpan di dalam folder. Buka atau buat folder untuk mulai mengunggah."
            : undefined
        }
        below={<Breadcrumbs path={isRoot ? [] : (pathQuery.data ?? [])} />}
        actions={
          canWrite ? (
            <>
              <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
                <FolderPlus className="size-4" />
                Folder Baru
              </Button>
              <Button
                onClick={() => setCreateDocOpen(true)}
                disabled={isRoot}
                title={isRoot ? "Masuk ke sebuah folder untuk mengunggah dokumen" : undefined}
              >
                <UploadCloud className="size-4" />
                Unggah Dokumen
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Toolbar / bilah aksi massal */}
      {data && !isEmpty &&
        (selectedIds.length > 0 ? (
          <BulkActionBar
            count={selectedIds.length}
            total={allDocs.length}
            canDelete={canDelete}
            busy={bulkBusy}
            onSelectAll={selectAll}
            onClear={clearSelection}
            onDownload={handleBulkDownload}
            onDelete={() => setDeleteTarget({ kind: "bulk", ids: selectedIds })}
          />
        ) : (
          <FolderToolbar
            filters={filters}
            onChange={setFilters}
            availableExtensions={availableExtensions}
            view={view}
            onViewChange={setView}
            total={allFolders.length + allDocs.length}
            shown={folders.length + docs.length}
          />
        ))}

      {/* Isi */}
      {contents.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : contents.isError ? (
        <EmptyState
          tone="destructive"
          title="Gagal memuat isi folder"
          description="Coba muat ulang halaman."
        />
      ) : isEmpty ? (
        <EmptyState
          title="Folder ini kosong"
          description={
            canWrite ? "Buat folder atau unggah dokumen untuk memulai." : "Belum ada isi di folder ini."
          }
        />
      ) : noMatch ? (
        <EmptyState
          title="Tidak ada yang cocok"
          description="Ubah kata kunci atau lepas filter untuk melihat item lain."
          action={
            <Button variant="outline" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>
              Reset filter
            </Button>
          }
        />
      ) : view === "table" ? (
        <DocumentTable
          folders={folders}
          documents={docs}
          canWrite={canWrite}
          canDelete={canDelete}
          selectable={selectable}
          selected={selectedSet}
          onToggle={toggleSelect}
          onToggleAll={toggleAllVisible}
          handlers={handlers}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              canWrite={canWrite}
              canDelete={canDelete}
              onOpen={() => handlers.onOpen("folder", folder.id)}
              onRename={() => handlers.onRename("folder", folder.id, folder.name)}
              onDelete={() => handlers.onDelete("folder", folder.id, folder.name)}
            />
          ))}
          {docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              canWrite={canWrite}
              canDelete={canDelete}
              selectable={selectable}
              selected={selectedSet.has(doc.id)}
              anySelected={selectedIds.length > 0}
              onToggle={() => toggleSelect(doc.id)}
              onOpen={() => handlers.onOpen("document", doc.id)}
              onRename={() => handlers.onRename("document", doc.id, doc.title)}
              onDelete={() => handlers.onDelete("document", doc.id, doc.title)}
            />
          ))}
        </div>
      )}

      {filtering && !noMatch && data && !isEmpty && (
        <p className="font-mono text-[11px] text-muted-foreground">
          Filter aktif — hanya menampilkan item yang cocok di folder ini.
        </p>
      )}

      {/* Dialogs */}
      <CreateFolderDialog
        key={`cf-${createFolderOpen}`}
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSubmit={handleCreateFolder}
        pending={createFolder.isPending}
      />
      <CreateDocumentDialog
        key={`cd-${createDocOpen}`}
        open={createDocOpen}
        onOpenChange={setCreateDocOpen}
        onSubmit={handleCreateDocument}
        pending={createDocument.isPending}
      />
      <RenameDialog
        key={`rn-${renameTarget?.id ?? "none"}`}
        open={renameTarget !== null}
        onOpenChange={(v) => !v && setRenameTarget(null)}
        title={renameTarget?.kind === "folder" ? "Ganti Nama Folder" : "Ganti Judul Dokumen"}
        label={renameTarget?.kind === "folder" ? "Nama folder" : "Judul dokumen"}
        initialValue={renameTarget?.name ?? ""}
        onSubmit={handleRename}
        pending={renameFolder.isPending || renameDocument.isPending}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && !bulkBusy && setDeleteTarget(null)}
        title={
          deleteTarget?.kind === "bulk"
            ? `Hapus ${deleteTarget.ids.length} dokumen?`
            : deleteTarget?.kind === "folder"
              ? "Hapus folder?"
              : "Hapus dokumen?"
        }
        description={
          deleteTarget?.kind === "bulk"
            ? "Semua dokumen terpilih beserta seluruh versinya akan dihapus permanen."
            : deleteTarget?.kind === "folder"
              ? `Folder "${deleteTarget?.name}" beserta sub-foldernya akan dihapus. Folder yang berisi dokumen tidak dapat dihapus.`
              : `Dokumen "${deleteTarget?.name}" dan seluruh versinya akan dihapus permanen.`
        }
        onConfirm={handleDelete}
        pending={bulkBusy || deleteFolder.isPending || deleteDocument.isPending}
      />
    </div>
  );
}

/* ------------------------------ item cards ------------------------------ */

function FolderCard({
  folder,
  canWrite,
  canDelete,
  onOpen,
  onRename,
  onDelete,
}: {
  folder: Folder;
  canWrite: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
        <FolderIcon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{folder.name}</p>
        <p className="text-xs text-muted-foreground">Diperbarui {formatDate(folder.updated_at)}</p>
      </div>
      <ItemActionsMenu
        canWrite={canWrite}
        canDelete={canDelete}
        openLabel="Buka folder"
        onOpen={onOpen}
        onRename={onRename}
        onDelete={onDelete}
      />
    </div>
  );
}

function DocumentCard({
  doc,
  canWrite,
  canDelete,
  selectable,
  selected,
  anySelected,
  onToggle,
  onOpen,
  onRename,
  onDelete,
}: {
  doc: DocumentItem;
  canWrite: boolean;
  canDelete: boolean;
  selectable: boolean;
  selected: boolean;
  anySelected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_META[doc.status];
  return (
    <div
      role="button"
      tabIndex={0}
      data-selected={selected || undefined}
      onClick={anySelected ? onToggle : onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring",
        selected && "border-primary/60 bg-primary/5 hover:bg-primary/10",
      )}
    >
      {selectable && (
        <span
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-2 left-2 transition-opacity",
            selected || anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <Checkbox aria-label={`Pilih ${doc.title}`} checked={selected} onCheckedChange={onToggle} />
        </span>
      )}
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FileIcon extension={doc.extension} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{doc.title}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase">{doc.extension}</span>
          <span>·</span>
          <span>{formatBytes(doc.size_bytes)}</span>
          <span>·</span>
          <span>v{doc.current_version}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className={status.className}>
          {status.label}
        </Badge>
        <ItemActionsMenu
          canWrite={canWrite}
          canDelete={canDelete}
          openLabel="Buka detail"
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
