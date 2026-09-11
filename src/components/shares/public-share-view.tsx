"use client";

import { toast } from "sonner";
import { Download, Lock, ShieldCheck } from "lucide-react";
import { usePublicShare } from "@/hooks/use-share-links";
import { downloadDocument, downloadToast } from "@/lib/download";
import { formatBytes, formatDate, formatRemaining, STATUS_META } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon } from "@/components/folders/file-icon";
import { DocumentPreview } from "@/components/folders/document-preview";

/**
 * Tampilan dokumen untuk pengunjung tautan publik (tanpa login).
 * Sengaja minim: identitas dokumen, sisa masa berlaku, pratinjau/unduh.
 */
export function PublicShareView({ token }: { token: string }) {
  const share = usePublicShare(token);

  if (share.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (share.isError || !share.data) {
    return (
      <div className="border-y border-rule py-8">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-serif text-xl leading-snug">Tautan tidak dapat dibuka</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {getApiErrorMessage(share.error, "Tautan tidak valid.")} Minta pemilik dokumen untuk
              membuat tautan baru.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { link, document: doc } = share.data;
  const status = STATUS_META[doc.status];
  const canDownload = link.access === "DOWNLOADER";

  async function handleDownload() {
    try {
      const result = await downloadDocument({
        id: doc.id,
        title: doc.title,
        extension: doc.extension,
        current_version: doc.current_version,
      });
      toast.success(downloadToast(result));
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal mengunduh."));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-4 border-b border-rule pb-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FileIcon extension={doc.extension} className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-2xl">{doc.title}</h1>
            <Badge variant="secondary" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="uppercase">{doc.extension}</span> · {formatBytes(doc.size_bytes)} · Versi{" "}
            {doc.current_version} · Folder {doc.folder_name} · Diperbarui {formatDate(doc.updated_at)}
          </p>
        </div>
        {canDownload ? (
          <Button onClick={handleDownload}>
            <Download className="size-4" />
            Unduh
          </Button>
        ) : (
          <Button variant="outline" disabled title="Tautan ini hanya mengizinkan pratinjau">
            <Lock className="size-4" />
            Hanya lihat
          </Button>
        )}
      </div>

      <DocumentPreview documentId={doc.id} extension={doc.extension} title={doc.title} />

      <p className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5" />
        Tautan berlaku {formatRemaining(link.expires_at).toLowerCase()} · akses{" "}
        {canDownload ? "lihat & unduh" : "lihat saja"} · setiap pembukaan tercatat di audit log.
      </p>
    </div>
  );
}
