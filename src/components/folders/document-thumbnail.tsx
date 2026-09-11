"use client";

import { useThumbnail } from "@/hooks/use-thumbnail";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/types";
import { FileIcon } from "@/components/folders/file-icon";

/**
 * Thumbnail dokumen ala kartu Paperless: halaman pertama PDF / gambar, cuplikan
 * teks untuk berkas teks, atau "kertas" placeholder untuk format lain.
 * Selalu dirender sebagai lembar kertas terang agar konsisten di tema gelap.
 */
export function DocumentThumbnail({
  doc,
  className,
  fit = "top",
}: {
  doc: Pick<DocumentItem, "id" | "title" | "extension" | "current_version">;
  className?: string;
  /** "top" memotong bagian bawah (kartu grid); "contain" menampilkan seluruh halaman. */
  fit?: "top" | "contain";
}) {
  const thumb = useThumbnail(doc);
  const data = thumb.data;

  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden bg-[#f3f1ec] text-[#1f1f1f] dark:bg-[#e9e7e2]",
        className,
      )}
    >
      {data?.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL hasil render lokal
        <img
          src={data.src}
          alt=""
          className={cn("h-full w-full", fit === "top" ? "object-cover object-top" : "object-contain")}
        />
      ) : data?.kind === "text" ? (
        <pre className="h-full w-full overflow-hidden px-3 py-2.5 font-mono text-[8.5px] leading-[1.45] whitespace-pre-wrap break-words text-[#2a2a2a]">
          {data.text}
        </pre>
      ) : (
        <PaperPlaceholder title={doc.title} extension={doc.extension} loading={thumb.isLoading} />
      )}
      {/* Bayangan tepi kertas */}
      <span className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" />
    </div>
  );
}

/** Kertas kosong dengan judul dan garis-garis samar — untuk data contoh / format tanpa pratinjau. */
function PaperPlaceholder({ title, extension, loading }: { title: string; extension: string; loading: boolean }) {
  return (
    <div className={cn("flex h-full w-full flex-col gap-2 px-4 py-4", loading && "animate-pulse")}>
      <div className="flex items-center justify-between">
        <FileIcon extension={extension} className="size-5" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#6b6b6b]">.{extension}</span>
      </div>
      <p className="line-clamp-2 font-serif text-[13px] leading-snug text-[#1f1f1f]">{title}</p>
      <div className="mt-1 space-y-1.5">
        {[92, 100, 84, 96, 70, 88, 60].map((w, i) => (
          <span key={i} className="block h-1 rounded-full bg-[#1f1f1f]/10" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}
