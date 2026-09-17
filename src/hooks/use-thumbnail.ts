"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchThumbnail } from "@/lib/thumbnails";
import type { DocumentItem } from "@/types";

export const thumbnailKeys = {
  doc: (id: string, version: number) => ["thumbnail", id, version] as const,
};

/** Thumbnail kartu dokumen; di-cache per (dokumen, versi) di query cache dan IndexedDB. */
export function useThumbnail(doc: Pick<DocumentItem, "id" | "extension" | "current_version">) {
  return useQuery({
    queryKey: thumbnailKeys.doc(doc.id, doc.current_version),
    queryFn: () => fetchThumbnail(doc.id, doc.extension, doc.current_version),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
