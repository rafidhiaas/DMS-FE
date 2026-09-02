"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Pencil,
  Share2,
  Trash2,
  UploadCloud,
  History,
  FileWarning,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { useDocument, useRenameDocument, useDeleteDocument, useUploadVersion } from "@/hooks/use-documents";
import { downloadDocument } from "@/lib/download";
import { formatBytes, formatDateTime, STATUS_META, ALLOWED_EXTENSIONS, type AllowedExtension } from "@/lib/format";
import type { Role } from "@/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileIcon } from "@/components/folders/file-icon";
import { RenameDialog, DeleteConfirmDialog } from "@/components/folders/folder-dialogs";
import { ShareDialog } from "@/components/shares/share-dialog";

export function DocumentDetail({
  documentId,
  role,
  currentUserId,
}: {
  documentId: string;
  role: Role;
  currentUserId: string;
}) {
  const router = useRouter();
  const canWrite = role !== "AUDITOR";
  const canDelete = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  const { data: doc, isLoading, isError } = useDocument(documentId);
  const renameDocument = useRenameDocument();
  const deleteDocument = useDeleteDocument();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FileWarning className="size-10 text-muted-foreground" />
          <p className="font-medium">Dokumen tidak ditemukan</p>
          <Button variant="outline" onClick={() => router.push("/folders")}>
            Kembali ke Folder
          </Button>
        </div>
      </div>
    );
  }

  const status = STATUS_META[doc.status];

  function handleRename(value: string) {
    renameDocument.mutate(
      { id: documentId, title: value },
      {
        onSuccess: () => {
          toast.success("Judul diperbarui.");
          setRenameOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  async function handleDownload() {
    try {
      await downloadDocument({
        id: documentId,
        title: doc!.title,
        extension: doc!.extension,
        current_version: doc!.current_version,
      });
      toast.success("Berkas simulasi diunduh (menunggu integrasi S3).");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh berkas.");
    }
  }

  function handleDelete() {
    const folderId = doc!.folder_id;
    deleteDocument.mutate(documentId, {
      onSuccess: () => {
        toast.success("Dokumen dihapus.");
        router.push(`/folders/${folderId}`);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/folders/${doc.folder_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke folder “{doc.folder.name}”
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 rounded-xl border bg-card p-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted">
          <FileIcon extension={doc.extension} className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{doc.title}</h1>
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="uppercase">{doc.extension}</span>
            <span>·</span>
            <span>{formatBytes(doc.size_bytes)}</span>
            <span>·</span>
            <span>Versi {doc.current_version}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="size-4" />
            Unduh
          </Button>
          {canWrite && (
            <>
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="size-4" />
                Bagikan
              </Button>
              <Button onClick={() => setVersionOpen(true)}>
                <UploadCloud className="size-4" />
                Versi Baru
              </Button>
            </>
          )}
          {(canWrite || canDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canWrite && (
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <Pencil className="size-4" />
                    Ganti judul
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="size-4" />
                      Hapus dokumen
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pratinjau</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center text-muted-foreground">
              <FileIcon extension={doc.extension} className="size-10" />
              <p className="text-sm">
                Pratinjau berkas belum tersedia.
              </p>
              <p className="text-xs">
                Menunggu integrasi Object Storage (S3) di backend.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Version history */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" />
              Riwayat Versi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {doc.versions.map((v) => (
              <div
                key={v.id}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Versi {v.version_number}</span>
                  {v.version_number === doc.current_version && (
                    <Badge variant="outline" className="text-xs">
                      Terkini
                    </Badge>
                  )}
                </div>
                {v.changelog && (
                  <p className="mt-1 text-muted-foreground">{v.changelog}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(v.created_at)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <RenameDialog
        key={`doc-rename-${renameOpen}`}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        title="Ganti Judul Dokumen"
        label="Judul dokumen"
        initialValue={doc.title}
        onSubmit={handleRename}
        pending={renameDocument.isPending}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Hapus dokumen?"
        description={`Dokumen "${doc.title}" dan seluruh versinya akan dihapus permanen.`}
        onConfirm={handleDelete}
        pending={deleteDocument.isPending}
      />
      <UploadVersionDialog
        key={`doc-ver-${versionOpen}`}
        documentId={documentId}
        currentExtension={doc.extension}
        open={versionOpen}
        onOpenChange={setVersionOpen}
      />
      <ShareDialog
        key={`doc-share-${shareOpen}`}
        documentId={documentId}
        documentTitle={doc.title}
        currentUserId={currentUserId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}

/* ------------------------- Upload Version Dialog ------------------------- */

function UploadVersionDialog({
  documentId,
  currentExtension,
  open,
  onOpenChange,
}: {
  documentId: string;
  currentExtension: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const uploadVersion = useUploadVersion();
  const [sizeBytes, setSizeBytes] = useState(102400);
  const [extension, setExtension] = useState(currentExtension);
  const [changelog, setChangelog] = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if ((ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      setExtension(ext as AllowedExtension);
    }
    setSizeBytes(file.size || 102400);
  }

  function submit() {
    uploadVersion.mutate(
      { id: documentId, size_bytes: sizeBytes, changelog: changelog.trim() || undefined, extension },
      {
        onSuccess: () => {
          toast.success("Versi baru ditambahkan.");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unggah Versi Baru</DialogTitle>
          <DialogDescription>
            Versi baru dibuat otomatis; versi lama tetap tersimpan di riwayat.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-accent">
            <UploadCloud className="size-6" />
            <span>Pilih berkas versi baru</span>
            <span className="text-xs">Ukuran terdeteksi: {formatBytes(sizeBytes)}</span>
            <input type="file" className="hidden" onChange={handleFile} />
          </label>
          <div className="space-y-2">
            <Label htmlFor="changelog">Catatan Perubahan (opsional)</Label>
            <Textarea
              id="changelog"
              value={changelog}
              placeholder="mis. Revisi pasal 4, perbaikan angka."
              onChange={(e) => setChangelog(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={uploadVersion.isPending} onClick={submit}>
            {uploadVersion.isPending && <Loader2 className="size-4 animate-spin" />}
            Unggah Versi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
