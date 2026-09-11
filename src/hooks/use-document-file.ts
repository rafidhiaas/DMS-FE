"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDocumentFile } from "@/lib/api/files";

export const fileKeys = {
  file: (documentId: string, versionNumber?: number) =>
    ["document-file", documentId, versionNumber ?? "current"] as const,
};

/**
 * Berkas asli dokumen + object URL siap pakai untuk <iframe>/<img>.
 * URL dicabut otomatis saat blob berganti atau komponen dilepas.
 */
export function useDocumentFile(documentId: string, versionNumber?: number, enabled = true) {
  const query = useQuery({
    queryKey: fileKeys.file(documentId, versionNumber),
    queryFn: () => fetchDocumentFile(documentId, versionNumber),
    enabled,
    staleTime: 60_000,
  });

  const blob = query.data?.blob;
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return { ...query, url };
}
