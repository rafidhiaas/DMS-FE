"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Folder as FolderIcon, FolderPlus, UploadCloud } from "lucide-react";
import {
  useFolderContents,
  useFolderPath,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
  useMoveFolder,
} from "@/hooks/use-folders";
import {
  useCreateDocument,
  useRenameDocument,
  useDeleteDocument,
  useMoveDocument,
} from "@/hooks/use-documents";
import { useLocalPref } from "@/hooks/use-local-pref";
import { getSavedView, useSavedViews } from "@/lib/saved-views";
import { downloadDocument } from "@/lib/download";
import { formatDate } from "@/lib/format";
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
import type { Role, Folder } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Breadcrumbs } from "@/components/folders/breadcrumbs";
import { ItemActionsMenu } from "@/components/folders/item-actions-menu";
import { FolderToolbar } from "@/components/folders/folder-toolbar";
import { DocumentTable, type ItemHandlers } from "@/components/folders/document-table";
import { BulkActionBar } from "@/components/folders/bulk-action-bar";
import { DocumentCard, DocumentCardLarge } from "@/components/folders/document-cards";
import { MoveDialog } from "@/components/folders/move-dialog";
import { SaveViewDialog } from "@/components/folders/save-view-dialog";
import { BulkMetadataDialog } from "@/components/folders/edit-metadata-dialog";
import {
  CreateFolderDialog,
  CreateDocumentDialog,
  RenameDialog,
  DeleteConfirmDialog,
  describeFile,
} from "@/components/folders/folder-dialogs";
import { asDuplicateError } from "@/lib/api/documents";

type Target = { kind: "folder" | "document"; id: string; name: string };
type DeleteTarget = Target | { kind: "bulk"; ids: string[] };
type MoveTarget = Target | { kind: "bulk"; ids: string[] };

const VIEW_PREF_KEY = "dms_folder_view";

export function FolderBrowser({ folderId, role }: { folderId: string; role: Role }) {
  const router = useRouter();
  const isRoot = folderId === "root";
  const searchParams = useSearchParams();
  const requestedViewId = searchParams.get("view");
  const savedViews = useSavedViews();
  const activeView = savedViews.views.find((v) => v.id === requestedViewId && v.folderId === folderId) ?? null;

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
  const moveFolder = useMoveFolder();
  const moveDocument = useMoveDocument();

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [createDocOpen, setCreateDocOpen] = useState(false);
  /* Drag-and-drop: berkas yang dijatuhkan mengisi dialog unggah; nonce memaksa remount. */
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [uploadNonce, setUploadNonce] = useState(0);
  /* Kedalaman dragenter/dragleave — menghindari kedip saat kursor melewati elemen anak. */
  const [dragDepth, setDragDepth] = useState(0);
  const [renameTarget, setRenameTarget] = useState<Target | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);

  // Tampilan Tersimpan: filter awal dibaca sinkron dari localStorage (komponen di-remount via key per ?view=).
  const [filters, setFilters] = useState<ListFilters>(() => {
    const v = getSavedView(requestedViewId);
    return v && v.folderId === folderId ? v.filters : EMPTY_FILTERS;
  });
  const [prefView, setPrefView] = useLocalPref<ViewMode>(VIEW_PREF_KEY, "grid", VIEW_MODES);
  const [viewOverride, setViewOverride] = useState<ViewMode | null>(() => {
    const v = getSavedView(requestedViewId);
    return v && v.folderId === folderId ? v.view : null;
  });
  const view = viewOverride ?? prefView;
  const setView = (next: ViewMode) => {
    setViewOverride(null);
    setPrefView(next);
  };
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [bulkMetaOpen, setBulkMetaOpen] = useState(false);
  /* Konfirmasi duplikat: berkas dengan checksum sama sudah ada. */
  const [duplicate, setDuplicate] = useState<{
    input: { title: string; extension: string; size_bytes: number; file?: File };
    existing: { id: string; title: string; folder_name: string };
  } | null>(null);
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
    onMove: (kind, id, name) => setMoveTarget({ kind, id, name }),
    onDelete: (kind, id, name) => setDeleteTarget({ kind, id, name }),
  };

  async function handleMove(targetFolderId: string | null) {
    if (!moveTarget) return;
    if (moveTarget.kind === "folder") {
      moveFolder.mutate(
        { id: moveTarget.id, parentId: targetFolderId },
        {
          onSuccess: () => {
            toast.success(`Folder "${moveTarget.name}" dipindahkan.`);
            setMoveTarget(null);
          },
          onError: (e) => toast.error(e.message),
        },
      );
      return;
    }
    if (!targetFolderId) return; // dokumen wajib berada di dalam folder
    const ids = moveTarget.kind === "bulk" ? moveTarget.ids : [moveTarget.id];
    setBulkBusy(true);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        await moveDocument.mutateAsync({ id, folder_id: targetFolderId });
        ok += 1;
      } catch (err) {
        failed += 1;
        if (ids.length === 1) toast.error(err instanceof Error ? err.message : "Gagal memindahkan.");
      }
    }
    setBulkBusy(false);
    if (ok > 0) {
      setMoveTarget(null);
      clearSelection();
      toast.success(failed === 0 ? `${ok} dokumen dipindahkan.` : `${ok} dipindahkan, ${failed} gagal.`);
    }
  }

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

  function handleSaveView(input: { name: string; showInSidebar: boolean; showOnDashboard: boolean }) {
    const created = savedViews.add({
      ...input,
      folderId,
      folderName: pathQuery.data?.at(-1)?.name ?? "Folder",
      filters,
      view,
    });
    setSaveViewOpen(false);
    toast.success(`Tampilan “${created.name}” disimpan.`);
    router.replace(`/folders/${folderId}?view=${created.id}`);
  }

  function openUploadDialog(file: File | null) {
    setDroppedFile(file);
    setUploadNonce((n) => n + 1);
    setCreateDocOpen(true);
  }

  /* ---------------------------- drag-and-drop --------------------------- */

  const canDrop = canWrite && !isRoot;

  function hasFiles(e: React.DragEvent): boolean {
    return Array.from(e.dataTransfer.types).includes("Files");
  }

  function onDragEnter(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragDepth((d) => d + 1);
  }

  function onDragLeave(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    setDragDepth((d) => Math.max(0, d - 1));
  }

  function onDragOver(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault(); // wajib agar browser mengizinkan drop
    e.dataTransfer.dropEffect = canDrop ? "copy" : "none";
  }

  async function onDrop(e: React.DragEvent) {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDragDepth(0);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    if (!canWrite) {
      toast.error("Peran Anda hanya-baca; tidak dapat mengunggah dokumen.");
      return;
    }
    if (isRoot) {
      toast.error("Masuk ke sebuah folder terlebih dahulu untuk mengunggah dokumen.");
      return;
    }

    // Satu berkas → buka dialog agar judul bisa disesuaikan.
    if (files.length === 1) {
      openUploadDialog(files[0]);
      return;
    }

    // Banyak berkas → unggah beruntun memakai nama berkas sebagai judul.
    setBulkBusy(true);
    let ok = 0;
    const skipped: string[] = [];
    const duplicates: string[] = [];
    for (const file of files) {
      const info = describeFile(file);
      if (!info.extension) {
        skipped.push(file.name);
        continue;
      }
      try {
        await createDocument.mutateAsync({
          title: info.title,
          extension: info.extension,
          size_bytes: info.size_bytes,
          folder_id: folderId,
          file,
        });
        ok += 1;
      } catch (err) {
        const dup = asDuplicateError(err);
        if (dup) duplicates.push(`${file.name} (sudah ada: ${dup.existing.title})`);
        else toast.error(`${file.name}: ${err instanceof Error ? err.message : "gagal diunggah"}`);
      }
    }
    setBulkBusy(false);
    if (ok > 0) toast.success(`${ok} dokumen diunggah.`);
    if (skipped.length > 0) {
      toast.warning(`${skipped.length} berkas dilewati (ekstensi tidak didukung): ${skipped.join(", ")}`);
    }
    if (duplicates.length > 0) {
      toast.warning(`${duplicates.length} berkas duplikat dilewati: ${duplicates.join("; ")}`);
    }
  }

  function handleCreateDocument(
    input: { title: string; extension: string; size_bytes: number; file?: File },
    allowDuplicate = false,
  ) {
    createDocument.mutate(
      { ...input, folder_id: folderId, allow_duplicate: allowDuplicate },
      {
        onSuccess: () => {
          toast.success(`Dokumen "${input.title}" diunggah.`);
          setCreateDocOpen(false);
          setDuplicate(null);
        },
        onError: (e) => {
          const dup = asDuplicateError(e);
          if (dup) setDuplicate({ input, existing: dup.existing });
          else toast.error(e.message);
        },
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
      if (failed === 0) toast.success(`${ok} dokumen dipindahkan ke Sampah.`);
      else toast.warning(`${ok} dokumen ke Sampah, ${failed} gagal.`);
      return;
    }
    const isFolder = deleteTarget.kind === "folder";
    const opts = {
      onSuccess: () => {
        toast.success(isFolder ? "Folder dihapus." : "Dokumen dipindahkan ke Sampah.");
        setDeleteTarget(null);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (isFolder) deleteFolder.mutate(deleteTarget.id, opts);
    else deleteDocument.mutate(deleteTarget.id, opts);
  }

  async function handleBulkDownload() {
    setBulkBusy(true);
    let ok = 0;
    let real = 0;
    for (const id of selectedIds) {
      const d = allDocs.find((x) => x.id === id);
      if (!d) continue;
      try {
        const result = await downloadDocument({
          id: d.id,
          title: d.title,
          extension: d.extension,
          current_version: d.current_version,
        });
        if (result === "file") real += 1;
        ok += 1;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal mengunduh.");
        break;
      }
    }
    setBulkBusy(false);
    if (ok > 0) {
      toast.success(
        real === ok
          ? `${ok} berkas diunduh.`
          : `${ok} berkas diunduh (${ok - real} berupa simulasi karena data contoh).`,
      );
    }
  }

  /* ------------------------------- render ------------------------------ */

  const isEmpty = data && allFolders.length === 0 && allDocs.length === 0;
  const noMatch = data && !isEmpty && folders.length === 0 && docs.length === 0;

  const dragging = dragDepth > 0;

  return (
    <div
      className="relative mx-auto min-h-[70vh] max-w-6xl space-y-5"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Lapisan drop — muncul saat berkas diseret di atas halaman. */}
      {dragging && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-background/85 text-center backdrop-blur-[2px]",
            canDrop ? "border-primary text-primary" : "border-destructive/60 text-destructive",
          )}
        >
          <UploadCloud className="size-8" />
          <p className="font-medium">
            {canDrop
              ? `Lepaskan untuk mengunggah ke “${pathQuery.data?.at(-1)?.name ?? "folder ini"}”`
              : isRoot
                ? "Masuk ke sebuah folder dulu untuk mengunggah"
                : "Peran Anda hanya-baca"}
          </p>
          {canDrop && (
            <p className="text-xs text-muted-foreground">
              Satu berkas membuka dialog; beberapa berkas langsung diunggah.
            </p>
          )}
        </div>
      )}

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
                onClick={() => openUploadDialog(null)}
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
            canWrite={canWrite}
            canDelete={canDelete}
            busy={bulkBusy}
            onSelectAll={selectAll}
            onClear={clearSelection}
            onDownload={handleBulkDownload}
            onMove={() => setMoveTarget({ kind: "bulk", ids: selectedIds })}
            onEditMeta={() => setBulkMetaOpen(true)}
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
            activeViewName={activeView?.name ?? null}
            onSaveView={isRoot ? undefined : () => setSaveViewOpen(true)}
            onClearView={activeView ? () => router.replace(`/folders/${folderId}`) : undefined}
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
            canDrop
              ? "Buat folder, unggah dokumen, atau seret berkas ke halaman ini untuk memulai."
              : canWrite
                ? "Buat folder atau unggah dokumen untuk memulai."
                : "Belum ada isi di folder ini."
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
      ) : view === "large" ? (
        <div className="space-y-3">
          {folders.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  canWrite={canWrite}
                  canDelete={canDelete}
                  onOpen={() => handlers.onOpen("folder", folder.id)}
                  onRename={() => handlers.onRename("folder", folder.id, folder.name)}
                  onMove={() => handlers.onMove("folder", folder.id, folder.name)}
                  onDelete={() => handlers.onDelete("folder", folder.id, folder.name)}
                />
              ))}
            </div>
          )}
          {docs.map((doc) => (
            <DocumentCardLarge
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
              onMove={() => handlers.onMove("document", doc.id, doc.title)}
              onDelete={() => handlers.onDelete("document", doc.id, doc.title)}
            />
          ))}
        </div>
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
              onMove={() => handlers.onMove("folder", folder.id, folder.name)}
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
              onMove={() => handlers.onMove("document", doc.id, doc.title)}
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
        key={`cd-${createDocOpen}-${uploadNonce}`}
        open={createDocOpen}
        onOpenChange={setCreateDocOpen}
        onSubmit={handleCreateDocument}
        pending={createDocument.isPending}
        initialFile={droppedFile}
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
            ? "Semua dokumen terpilih dipindahkan ke Sampah dan dapat dipulihkan selama 30 hari."
            : deleteTarget?.kind === "folder"
              ? `Folder "${deleteTarget?.name}" beserta sub-foldernya akan dihapus. Folder yang berisi dokumen tidak dapat dihapus.`
              : `Dokumen "${deleteTarget?.name}" dipindahkan ke Sampah dan dapat dipulihkan selama 30 hari.`
        }
        onConfirm={handleDelete}
        pending={bulkBusy || deleteFolder.isPending || deleteDocument.isPending}
      />
      <DeleteConfirmDialog
        open={duplicate !== null}
        onOpenChange={(v) => !v && setDuplicate(null)}
        title="Berkas identik sudah ada"
        description={`Isi berkas ini sama persis dengan dokumen "${duplicate?.existing.title ?? ""}" di folder ${duplicate?.existing.folder_name ?? ""}. Tetap unggah sebagai dokumen baru?`}
        confirmLabel="Tetap unggah"
        onConfirm={() => duplicate && handleCreateDocument(duplicate.input, true)}
        pending={createDocument.isPending}
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
        folderName={pathQuery.data?.at(-1)?.name ?? "Folder"}
        filters={filters}
        view={view}
        onSubmit={handleSaveView}
      />
      <MoveDialog
        key={`mv-${moveTarget ? (moveTarget.kind === "bulk" ? "bulk" : moveTarget.id) : "none"}`}
        open={moveTarget !== null}
        onOpenChange={(v) => !v && !bulkBusy && setMoveTarget(null)}
        title={
          moveTarget?.kind === "bulk"
            ? `Pindahkan ${moveTarget.ids.length} dokumen`
            : moveTarget?.kind === "folder"
              ? `Pindahkan folder “${moveTarget.name}”`
              : `Pindahkan “${moveTarget?.name ?? ""}”`
        }
        description={
          moveTarget?.kind === "folder"
            ? "Pilih folder induk baru. Folder tidak bisa dipindah ke dalam dirinya sendiri."
            : "Pilih folder tujuan. Dokumen harus berada di dalam sebuah folder."
        }
        movingFolderId={moveTarget?.kind === "folder" ? moveTarget.id : undefined}
        currentFolderId={
          moveTarget?.kind === "folder"
            ? (allFolders.find((f) => f.id === moveTarget.id)?.parent_folder_id ?? null)
            : isRoot
              ? null
              : folderId
        }
        allowRoot={moveTarget?.kind === "folder"}
        onSubmit={handleMove}
        pending={bulkBusy || moveFolder.isPending || moveDocument.isPending}
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
  onMove,
  onDelete,
}: {
  folder: Folder;
  canWrite: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
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
        onMove={onMove}
        onDelete={onDelete}
      />
    </div>
  );
}
