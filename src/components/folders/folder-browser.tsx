"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Folder as FolderIcon,
  FolderPlus,
  UploadCloud,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
  Inbox,
} from "lucide-react";
import {
  useFolderContents,
  useFolderPath,
  useCreateFolder,
  useRenameFolder,
  useDeleteFolder,
} from "@/hooks/use-folders";
import { useCreateDocument, useRenameDocument, useDeleteDocument } from "@/hooks/use-documents";
import { formatBytes, formatDate, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Role, Folder, DocumentItem } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Breadcrumbs } from "@/components/folders/breadcrumbs";
import { FileIcon } from "@/components/folders/file-icon";
import {
  CreateFolderDialog,
  CreateDocumentDialog,
  RenameDialog,
  DeleteConfirmDialog,
} from "@/components/folders/folder-dialogs";

type RenameTarget = { kind: "folder" | "document"; id: string; name: string };
type DeleteTarget = { kind: "folder" | "document"; id: string; name: string };

export function FolderBrowser({
  folderId,
  role,
}: {
  folderId: string;
  role: Role;
}) {
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
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  /* ------------------------------ handlers ------------------------------ */

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
    if (renameTarget.kind === "folder") {
      renameFolder.mutate({ id: renameTarget.id, name: value }, opts);
    } else {
      renameDocument.mutate({ id: renameTarget.id, title: value }, opts);
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    const opts = {
      onSuccess: () => {
        toast.success("Berhasil dihapus.");
        setDeleteTarget(null);
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (deleteTarget.kind === "folder") {
      deleteFolder.mutate(deleteTarget.id, opts);
    } else {
      deleteDocument.mutate(deleteTarget.id, opts);
    }
  }

  /* ------------------------------- render ------------------------------- */

  const data = contents.data;
  const isEmpty =
    data && data.subFolders.length === 0 && data.documents.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isRoot ? "Folder & Dokumen" : pathQuery.data?.at(-1)?.name ?? "Memuat..."}
          </h1>
          <div className="mt-1">
            <Breadcrumbs path={isRoot ? [] : pathQuery.data ?? []} />
          </div>
        </div>

        {canWrite && (
          <div className="flex gap-2">
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
          </div>
        )}
      </div>

      {isRoot && (
        <p className="text-sm text-muted-foreground">
          Dokumen disimpan di dalam folder. Buka atau buat folder untuk mulai mengunggah.
        </p>
      )}

      {/* Content */}
      {contents.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : contents.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Gagal memuat isi folder. Coba muat ulang halaman.
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <Inbox className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Folder ini kosong</p>
            <p className="text-sm text-muted-foreground">
              {canWrite
                ? "Buat folder atau unggah dokumen untuk memulai."
                : "Belum ada isi di folder ini."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data!.subFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              canWrite={canWrite}
              canDelete={canDelete}
              onOpen={() => router.push(`/folders/${folder.id}`)}
              onRename={() =>
                setRenameTarget({ kind: "folder", id: folder.id, name: folder.name })
              }
              onDelete={() =>
                setDeleteTarget({ kind: "folder", id: folder.id, name: folder.name })
              }
            />
          ))}
          {data!.documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              canWrite={canWrite}
              canDelete={canDelete}
              onOpen={() => router.push(`/documents/${doc.id}`)}
              onRename={() =>
                setRenameTarget({ kind: "document", id: doc.id, name: doc.title })
              }
              onDelete={() =>
                setDeleteTarget({ kind: "document", id: doc.id, name: doc.title })
              }
            />
          ))}
        </div>
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
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={deleteTarget?.kind === "folder" ? "Hapus folder?" : "Hapus dokumen?"}
        description={
          deleteTarget?.kind === "folder"
            ? `Folder "${deleteTarget?.name}" beserta sub-foldernya akan dihapus. Folder yang berisi dokumen tidak dapat dihapus.`
            : `Dokumen "${deleteTarget?.name}" dan seluruh versinya akan dihapus permanen.`
        }
        onConfirm={handleDelete}
        pending={deleteFolder.isPending || deleteDocument.isPending}
      />
    </div>
  );
}

/* ------------------------------ item cards ------------------------------ */

function ActionsMenu({
  canWrite,
  canDelete,
  openLabel,
  onOpen,
  onRename,
  onDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
  openLabel: string;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-8 shrink-0",
        )}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onOpen}>
          <ExternalLink className="size-4" />
          {openLabel}
        </DropdownMenuItem>
        {canWrite && (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="size-4" />
            Ganti nama
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Hapus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
        <p className="text-xs text-muted-foreground">
          Diperbarui {formatDate(folder.updated_at)}
        </p>
      </div>
      <ActionsMenu
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
  onOpen,
  onRename,
  onDelete,
}: {
  doc: DocumentItem;
  canWrite: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const status = STATUS_META[doc.status];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-ring"
    >
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
        <ActionsMenu
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
