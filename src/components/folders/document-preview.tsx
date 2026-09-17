"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileWarning } from "lucide-react";
import { useDocumentFile } from "@/hooks/use-document-file";
import { previewKindFor } from "@/lib/api/files";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { FileIcon } from "@/components/folders/file-icon";

/**
 * Panel pratinjau dokumen (sisi kanan detail & halaman publik).
 * PDF → iframe, gambar → img, teks/CSV → pre. Tipe lain hanya info + tombol buka.
 * Berkas tidak bisa diambil (hilang di storage / tanpa akses) → teks fallback yang jujur.
 */
export function DocumentPreview({
  documentId,
  extension,
  title,
  versionNumber,
  shareToken,
  className,
}: {
  documentId: string;
  extension: string;
  title: string;
  versionNumber?: number;
  /** Halaman publik /share/[token]: berkas diambil lewat tautan, tanpa login. */
  shareToken?: string;
  className?: string;
}) {
  const file = useDocumentFile(documentId, versionNumber, true, shareToken);
  const kind = previewKindFor(extension, file.data?.type);

  const text = useQuery({
    queryKey: ["document-file-text", documentId, versionNumber ?? "current"],
    queryFn: () => file.data!.blob.text(),
    enabled: kind === "text" && !!file.data,
  });

  if (file.isLoading) {
    return <Skeleton className={cn("h-72 rounded-lg", className)} />;
  }

  if (!file.data || !file.url) {
    return (
      <Fallback extension={extension} className={className}>
        <p className="text-sm">Berkas tidak dapat dimuat.</p>
        <p className="text-xs">Berkas tidak ditemukan di server atau Anda tidak memiliki akses.</p>
      </Fallback>
    );
  }

  const meta = (
    <p className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
      <span className="truncate">{file.data.name}</span>
      <span>
        {formatBytes(file.data.size)}
        {versionNumber ? ` · v${versionNumber}` : ""}
      </span>
    </p>
  );

  if (kind === "pdf") {
    return (
      <div className={cn("space-y-2", className)}>
        <iframe
          src={`${file.url}#toolbar=0&navpanes=0`}
          title={`Pratinjau ${title}`}
          className="h-[70vh] w-full rounded-lg border bg-white"
        />
        {meta}
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-center overflow-hidden rounded-lg border bg-muted/40 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL lokal, bukan aset statis */}
          <img src={file.url} alt={title} className="max-h-[70vh] max-w-full object-contain" />
        </div>
        {meta}
      </div>
    );
  }

  if (kind === "text") {
    return (
      <div className={cn("space-y-2", className)}>
        {text.isLoading ? (
          <Skeleton className="h-72 rounded-lg" />
        ) : (
          <pre className="max-h-[70vh] overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
            {text.data ?? ""}
          </pre>
        )}
        {meta}
      </div>
    );
  }

  return (
    <Fallback extension={extension} className={className}>
      <p className="text-sm">Pratinjau tidak tersedia untuk berkas .{extension}.</p>
      <p className="text-xs">Berkas tersimpan ({formatBytes(file.data.size)}). Buka di tab baru atau unduh.</p>
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}
      >
        <ExternalLink className="size-3.5" />
        Buka di tab baru
      </a>
    </Fallback>
  );
}

function Fallback({
  extension,
  className,
  children,
}: {
  extension: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-20 text-center text-muted-foreground",
        className,
      )}
    >
      {extension ? <FileIcon extension={extension} className="size-10" /> : <FileWarning className="size-10" />}
      {children}
    </div>
  );
}
