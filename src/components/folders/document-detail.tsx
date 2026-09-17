"use client";

import { useEffect, useState } from "react";
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
  Info,
  Users,
  Layers,
  Link2,
  FolderOpen,
  FolderInput,
  StickyNote,
  Send,
  Tags,
  FileText,
} from "lucide-react";
import {
  useDocument,
  useRenameDocument,
  useDeleteDocument,
  useUploadVersion,
  useMoveDocument,
} from "@/hooks/use-documents";
import { useNotes, useAddNote, useDeleteNote } from "@/hooks/use-notes";
import { useDocumentShares } from "@/hooks/use-shares";
import { useShareLinks } from "@/hooks/use-share-links";
import { useDocumentHistory } from "@/hooks/use-audit-logs";
import { downloadDocument, downloadToast } from "@/lib/download";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatRemaining,
  actionMeta,
  STATUS_META,
  ACCESS_LEVEL_META,
  ROLE_BADGE_CLASS,
  ALLOWED_EXTENSIONS,
  type AllowedExtension,
} from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import type {
  ActivityLog,
  DocumentDetail as DocumentDetailData,
  DocumentNote,
  DocumentShare,
  Role,
  ShareLink,
} from "@/types";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { MoveDialog } from "@/components/folders/move-dialog";
import { DocumentPreview } from "@/components/folders/document-preview";
import { EditMetadataDialog } from "@/components/folders/edit-metadata-dialog";
import { StatusActions } from "@/components/folders/status-actions";
import { ContentTab, useDocumentContent } from "@/components/folders/content-tab";
import { SimilarDocuments } from "@/components/folders/similar-documents";
import { TagChip } from "@/components/metadata/tag-chip";
import { useTags, useDocumentTypes, useCorrespondents } from "@/hooks/use-meta";
import { useCustomFields } from "@/hooks/use-custom-fields";
import { formatCustomValue } from "@/lib/api/custom-fields";
import { ShareDialog } from "@/components/shares/share-dialog";
import { ShareLinkPopover } from "@/components/shares/share-link-popover";
import { isExpired } from "@/lib/domain";
import { recordRecentDocument } from "@/lib/recent-docs";
import { PageHeader } from "@/components/page-header";

/**
 * Halaman detail dokumen — tata letak "split view" ala Paperless-ngx:
 * kiri = tab metadata (Detail / Versi / Riwayat / Akses), kanan = pratinjau.
 */
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
  const moveDocument = useMoveDocument();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const content = useDocumentContent(documentId);
  const hasContent = Boolean(content.data);

  // Jejak "Terakhir dibuka" (localStorage) — bukan state React, aman di effect.
  useEffect(() => {
    if (!doc) return;
    recordRecentDocument({
      id: doc.id,
      title: doc.title,
      extension: doc.extension,
      folder_name: doc.folder.name,
    });
  }, [doc]);
  const [versionOpen, setVersionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-28 rounded-xl" />
        <div className="grid gap-5 lg:grid-cols-5">
          <Skeleton className="h-80 rounded-xl lg:col-span-3" />
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="mx-auto max-w-6xl">
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
      const result = await downloadDocument({
        id: documentId,
        title: doc!.title,
        extension: doc!.extension,
        current_version: doc!.current_version,
      });
      toast.success(downloadToast(result));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh berkas.");
    }
  }

  function handleDelete() {
    const folderId = doc!.folder_id;
    deleteDocument.mutate(documentId, {
      onSuccess: () => {
        toast.success("Dokumen dipindahkan ke Sampah.");
        router.push(`/folders/${folderId}`);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleMove(targetFolderId: string | null) {
    if (!targetFolderId) return;
    moveDocument.mutate(
      { id: documentId, folder_id: targetFolderId },
      {
        onSuccess: () => {
          toast.success("Dokumen dipindahkan.");
          setMoveOpen(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/folders/${doc.folder_id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Kembali ke folder “{doc.folder.name}”
      </Link>

      {/* Kop dokumen — pola PageHeader agar seragam dengan halaman lain. */}
      <PageHeader
        eyebrow={`Dokumen · ${doc.folder.name}`}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-muted align-middle">
              <FileIcon extension={doc.extension} className="size-5" />
            </span>
            <span className="min-w-0 break-words">{doc.title}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
            <span className="font-mono text-[12px] uppercase">{doc.extension}</span>
            <span>·</span>
            <span>{formatBytes(doc.size_bytes)}</span>
            <span>·</span>
            <span>Versi {doc.current_version}</span>
            <span>·</span>
            <span>Diperbarui {formatDateTime(doc.updated_at)}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusActions documentId={documentId} status={doc.status} role={role} />
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
                <ShareLinkPopover documentId={documentId} />
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
                  aria-label="Aksi lain"
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canWrite && (
                    <>
                      <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                        <Pencil className="size-4" />
                        Ganti judul
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMoveOpen(true)}>
                        <FolderInput className="size-4" />
                        Pindahkan ke…
                      </DropdownMenuItem>
                    </>
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
        }
      />

      {/* Split view: tab metadata (kiri) + pratinjau (kanan). */}
      <div className="grid items-start gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <Tabs defaultValue="detail">
            <CardHeader className="border-b pb-0">
              <TabsList variant="line" className="-mb-px w-full flex-wrap justify-start">
                <TabsTrigger value="detail" className="flex-none">
                  <Info data-icon="inline-start" />
                  Detail
                </TabsTrigger>
                <TabsTrigger value="versions" className="flex-none">
                  <Layers data-icon="inline-start" />
                  Versi
                  <TabCount value={doc.versions.length} />
                </TabsTrigger>
                {hasContent && (
                  <TabsTrigger value="content" className="flex-none">
                    <FileText data-icon="inline-start" />
                    Konten
                  </TabsTrigger>
                )}
                <TabsTrigger value="notes" className="flex-none">
                  <StickyNote data-icon="inline-start" />
                  Catatan
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-none">
                  <History data-icon="inline-start" />
                  Riwayat
                </TabsTrigger>
                <TabsTrigger value="access" className="flex-none">
                  <Users data-icon="inline-start" />
                  Akses
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-5">
              <TabsContent value="detail">
                <DetailsTab doc={doc} canWrite={canWrite} />
              </TabsContent>
              <TabsContent value="versions">
                <VersionsTab doc={doc} />
              </TabsContent>
              {hasContent && (
                <TabsContent value="content">
                  <ContentTab documentId={documentId} />
                </TabsContent>
              )}
              <TabsContent value="notes">
                <NotesTab documentId={documentId} role={role} currentUserId={currentUserId} />
              </TabsContent>
              <TabsContent value="history">
                <HistoryTab documentId={documentId} />
              </TabsContent>
              <TabsContent value="access">
                <AccessTab
                  documentId={documentId}
                  canWrite={canWrite}
                  onManage={() => setShareOpen(true)}
                />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Pratinjau + dokumen mirip — menempel saat halaman digulir di layar lebar. */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pratinjau</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentPreview
              key={`preview-${doc.current_version}`}
              documentId={documentId}
              extension={doc.extension}
              title={doc.title}
            />
          </CardContent>
        </Card>
        <SimilarDocuments doc={doc} />
        </div>
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
        description={`Dokumen "${doc.title}" dipindahkan ke Sampah dan dapat dipulihkan selama 30 hari.`}
        onConfirm={handleDelete}
        pending={deleteDocument.isPending}
      />
      <MoveDialog
        key={`doc-move-${moveOpen}`}
        open={moveOpen}
        onOpenChange={setMoveOpen}
        title={`Pindahkan “${doc.title}”`}
        description="Pilih folder tujuan. Dokumen harus berada di dalam sebuah folder."
        currentFolderId={doc.folder_id}
        allowRoot={false}
        onSubmit={handleMove}
        pending={moveDocument.isPending}
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

/* ------------------------------ helpers -------------------------------- */

function TabCount({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <span className="ml-0.5 rounded-sm bg-muted px-1.5 font-mono text-[10.5px] text-muted-foreground">
      {value}
    </span>
  );
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <dt className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("text-sm break-words", mono && "font-mono text-[12.5px]")}>{children}</dd>
    </div>
  );
}

/* ------------------------------- Detail --------------------------------- */

function DetailsTab({ doc, canWrite }: { doc: DocumentDetailData; canWrite: boolean }) {
  const status = STATUS_META[doc.status];
  const tags = useTags();
  const types = useDocumentTypes();
  const correspondents = useCorrespondents();
  const customFields = useCustomFields();
  const [editOpen, setEditOpen] = useState(false);
  const filledFields = (customFields.data ?? []).filter((f) => doc.custom_fields && doc.custom_fields[f.id] != null);

  const docTags = (doc.tag_ids ?? [])
    .map((id) => tags.data?.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));
  const typeName = types.data?.find((t) => t.id === doc.document_type_id)?.name;
  const corrName = correspondents.data?.find((c) => c.id === doc.correspondent_id)?.name;

  return (
    <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
        <Field label="Judul">{doc.title}</Field>
        <Field label="Folder">
          <Link
            href={`/folders/${doc.folder_id}`}
            className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <FolderOpen className="size-4 text-muted-foreground" />
            {doc.folder.name}
          </Link>
        </Field>
        <Field label="Status">
          <Badge variant="secondary" className={status.className}>
            {status.label}
          </Badge>
        </Field>
        <Field label="Versi terkini">
          v{doc.current_version} dari {doc.versions.length} versi
        </Field>
        <Field label="Format" mono>
          .{doc.extension}
        </Field>
        <Field label="Ukuran">{formatBytes(doc.size_bytes)}</Field>
        <Field label="Dibuat">{formatDateTime(doc.created_at)}</Field>
        <Field label="Diperbarui">{formatDateTime(doc.updated_at)}</Field>
      </dl>

      <div className="border-t border-rule pt-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Tags className="size-4 text-muted-foreground" />
            Metadata
          </h3>
          {canWrite && (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" />
              Ubah metadata
            </Button>
          )}
        </div>
        <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field label="Tag">
            {docTags.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <span className="flex flex-wrap gap-1">
                {docTags.map((t) => (
                  <TagChip key={t.id} tag={t} />
                ))}
              </span>
            )}
          </Field>
          <Field label="Tipe dokumen">{typeName ?? <span className="text-muted-foreground">—</span>}</Field>
          <Field label="Pihak">{corrName ?? <span className="text-muted-foreground">—</span>}</Field>
          <Field label="Tanggal dokumen">
            {doc.document_date ? formatDate(doc.document_date) : <span className="text-muted-foreground">—</span>}
          </Field>
          <Field label="Nomor arsip (ASN)" mono>
            {doc.asn != null ? `#${doc.asn}` : <span className="font-sans text-muted-foreground">—</span>}
          </Field>
          <Field label="ID dokumen" mono>
            {doc.id}
          </Field>
          {filledFields.map((f) => (
            <Field key={f.id} label={f.name}>
              {f.type === "url" ? (
                <a href={String(doc.custom_fields![f.id])} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">
                  {String(doc.custom_fields![f.id])}
                </a>
              ) : (
                formatCustomValue(f, doc.custom_fields![f.id])
              )}
            </Field>
          ))}
          <div className="sm:col-span-2">
            <Field label="Deskripsi">
              {doc.description ? (
                <span className="whitespace-pre-wrap">{doc.description}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Field>
          </div>
        </dl>
      </div>

      <EditMetadataDialog key={`meta-${editOpen}`} doc={doc} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

/* -------------------------------- Versi --------------------------------- */

function VersionsTab({ doc }: { doc: DocumentDetailData }) {
  async function download(versionNumber: number) {
    try {
      const result = await downloadDocument({
        id: doc.id,
        title: doc.title,
        extension: doc.extension,
        current_version: doc.current_version,
        version_number: versionNumber,
      });
      toast.success(downloadToast(result));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh berkas.");
    }
  }

  return (
    <ol className="space-y-3">
      {doc.versions.map((v) => {
        const current = v.version_number === doc.current_version;
        return (
          <li
            key={v.id}
            className={cn("rounded-lg border p-3 text-sm", current && "border-primary/40 bg-primary/5")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Versi {v.version_number}</span>
              <span className="flex items-center gap-1.5">
                {current && (
                  <Badge variant="outline" className="text-xs">
                    Terkini
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  aria-label={`Unduh versi ${v.version_number}`}
                  onClick={() => download(v.version_number)}
                >
                  <Download className="size-3.5" />
                </Button>
              </span>
            </div>
            {v.changelog && <p className="mt-1 text-muted-foreground">{v.changelog}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(v.created_at)}</p>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------- Catatan -------------------------------- */

function NotesTab({
  documentId,
  role,
  currentUserId,
}: {
  documentId: string;
  role: Role;
  currentUserId: string;
}) {
  const notes = useNotes(documentId);
  const addNote = useAddNote(documentId);
  const deleteNote = useDeleteNote(documentId);
  const [body, setBody] = useState("");
  const canWrite = role !== "AUDITOR";
  const isAdmin = role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";

  function submit() {
    const text = body.trim();
    if (!text) return;
    addNote.mutate(text, {
      onSuccess: () => {
        setBody("");
        toast.success("Catatan ditambahkan.");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function remove(note: DocumentNote) {
    deleteNote.mutate(note.id, {
      onSuccess: () => toast.success("Catatan dihapus."),
      onError: (e) => toast.error(e.message),
    });
  }

  const list = notes.data ?? [];

  return (
    <div className="space-y-5">
      {canWrite && (
        <div className="space-y-2">
          <Label htmlFor="new-note">Catatan baru</Label>
          <Textarea
            id="new-note"
            value={body}
            placeholder="Tulis catatan untuk rekan kerja, mis. hal yang perlu direvisi…"
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit();
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">Ctrl+Enter untuk mengirim.</span>
            <Button size="sm" disabled={!body.trim() || addNote.isPending} onClick={submit}>
              {addNote.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              Tambah catatan
            </Button>
          </div>
        </div>
      )}

      {notes.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : notes.isError ? (
        <p className="text-sm text-destructive">Gagal memuat catatan.</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada catatan pada dokumen ini.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((note) => {
            const own = note.user_id === currentUserId;
            return (
              <li key={note.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium">{note.user?.name ?? note.user_id}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(note.created_at)}</span>
                  </div>
                  {(own || isAdmin) && canWrite && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-muted-foreground hover:text-destructive"
                      disabled={deleteNote.isPending}
                      onClick={() => remove(note)}
                      aria-label="Hapus catatan"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------- Riwayat -------------------------------- */

function HistoryTab({ documentId }: { documentId: string }) {
  const history = useDocumentHistory(documentId);

  if (history.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }
  if (history.isError) {
    return <p className="text-sm text-destructive">Gagal memuat riwayat dokumen.</p>;
  }
  const logs = history.data ?? [];
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat untuk dokumen ini.</p>;
  }
  return (
    <ol className="relative space-y-0 border-l border-rule pl-5">
      {logs.map((log) => (
        <HistoryEntry key={log.id} log={log} />
      ))}
    </ol>
  );
}

function HistoryEntry({ log }: { log: ActivityLog }) {
  const meta = actionMeta(log.action);
  return (
    <li className="relative pb-5 last:pb-0">
      <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-background bg-rule" />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className={meta.className}>
          {meta.label}
        </Badge>
        <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
      </div>
      <p className="mt-1 text-sm">{log.details}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        oleh {log.user?.name ?? log.user_id}
        {log.user?.email ? ` · ${log.user.email}` : ""}
      </p>
    </li>
  );
}

/* -------------------------------- Akses --------------------------------- */

function AccessTab({
  documentId,
  canWrite,
  onManage,
}: {
  documentId: string;
  canWrite: boolean;
  onManage: () => void;
}) {
  const shares = useDocumentShares(documentId);
  const links = useShareLinks(documentId);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4 text-muted-foreground" />
            Pengguna dengan akses
          </h3>
          {canWrite && (
            <Button size="sm" variant="outline" onClick={onManage}>
              <Share2 className="size-4" />
              Kelola
            </Button>
          )}
        </div>
        {shares.isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : shares.isError ? (
          <p className="text-sm text-destructive">Gagal memuat daftar akses.</p>
        ) : (shares.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum dibagikan ke siapa pun. Hanya pemilik dan admin yang bisa membuka dokumen ini.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {(shares.data ?? []).map((s) => (
              <ShareRow key={s.id} share={s} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="size-4 text-muted-foreground" />
            Tautan publik
          </h3>
          {canWrite && <ShareLinkPopover documentId={documentId} />}
        </div>
        {links.isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : links.isError ? (
          <p className="text-sm text-destructive">Gagal memuat tautan publik.</p>
        ) : (links.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tautan publik untuk dokumen ini.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {(links.data ?? []).map((l) => (
              <LinkRow key={l.id} link={l} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ShareRow({ share }: { share: DocumentShare }) {
  const level = ACCESS_LEVEL_META[share.access_level];
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium">{share.user?.name ?? share.user_id}</p>
        <p className="truncate text-xs text-muted-foreground">{share.user?.email ?? "—"}</p>
      </div>
      <div className="flex items-center gap-2">
        {share.user?.role && (
          <Badge variant="outline" className={ROLE_BADGE_CLASS[share.user.role]}>
            {ROLE_LABELS[share.user.role]}
          </Badge>
        )}
        <Badge variant="secondary" className={level.className} title={level.description}>
          {level.label}
        </Badge>
      </div>
    </li>
  );
}

function LinkRow({ link }: { link: ShareLink }) {
  const expired = isExpired(link);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
      <div className="min-w-0">
        <p className="truncate font-mono text-[12px]">/share/{link.token}</p>
        <p className="text-xs text-muted-foreground">
          Dibuat {formatDateTime(link.created_at)} · dibuka {link.access_count}×
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className={ACCESS_LEVEL_META[link.access].className}>
          {ACCESS_LEVEL_META[link.access].label}
        </Badge>
        <span className={cn("text-xs text-muted-foreground", expired && "text-destructive")}>
          {formatRemaining(link.expires_at)}
        </span>
      </div>
    </li>
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
  const [file, setFile] = useState<File | null>(null);
  const fileName = file?.name ?? null;

  function applyFile(next: File) {
    const ext = next.name.split(".").pop()?.toLowerCase() ?? "";
    if ((ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
      setExtension(ext as AllowedExtension);
    }
    setSizeBytes(next.size || 102400);
    setFile(next);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0];
    if (next) applyFile(next);
  }

  function submit() {
    uploadVersion.mutate(
      {
        id: documentId,
        size_bytes: sizeBytes,
        changelog: changelog.trim() || undefined,
        extension,
        file: file ?? undefined,
      },
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
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const next = e.dataTransfer.files?.[0];
              if (next) applyFile(next);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <UploadCloud className="size-6" />
            <span className={fileName ? "font-medium text-foreground" : undefined}>
              {fileName ?? "Pilih berkas versi baru, atau seret ke sini"}
            </span>
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
