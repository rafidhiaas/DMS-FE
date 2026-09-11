import { env } from "@/lib/env";
import { getFile, type StoredFile } from "@/lib/mocks/file-store";
import { findVersionId } from "@/lib/mocks/dms-store";

/**
 * Akses berkas asli sebuah dokumen (versi tertentu atau versi terkini).
 * MOCK: dibaca dari IndexedDB (berkas yang diunggah di browser ini).
 * BACKEND: menunggu endpoint presigned URL S3 — sementara `null`.
 */
export async function fetchDocumentFile(
  documentId: string,
  versionNumber?: number,
): Promise<StoredFile | null> {
  if (!env.USE_MOCKS) return null;
  const versionId = findVersionId(documentId, versionNumber);
  if (!versionId) return null;
  return getFile(versionId);
}

/** Tipe pratinjau yang bisa dirender langsung di browser. */
export type PreviewKind = "pdf" | "image" | "text" | "none";

export function previewKindFor(extension: string, mime?: string): PreviewKind {
  const ext = extension.toLowerCase();
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext) || mime?.startsWith("image/")) return "image";
  if (["txt", "csv", "md", "json", "log"].includes(ext) || mime?.startsWith("text/")) return "text";
  return "none";
}
