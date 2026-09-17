import { api } from "@/lib/api/client";

/**
 * Berkas asli sebuah dokumen (versi tertentu atau versi terkini).
 * Backend: `GET /documents/:id/file?version=&download=1` (cek izin + audit unduhan),
 * atau `GET /public/share/:token/file` untuk tautan publik tanpa login.
 */
export interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
  size: number;
}

export interface FileRequest {
  documentId: string;
  versionNumber?: number;
  /** Bila diisi, berkas diambil lewat tautan publik (tanpa sesi login). */
  shareToken?: string;
  /** true = dicatat sebagai unduhan & tunduk pada izin unduh. */
  download?: boolean;
}

/** `filename*=UTF-8''...` (RFC 5987) atau `filename="..."` dari Content-Disposition. */
function filenameFrom(disposition: string | undefined, fallback: string): string {
  if (!disposition) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (star) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* lanjut */
    }
  }
  return /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? fallback;
}

export async function fetchDocumentFile(req: FileRequest): Promise<StoredFile | null> {
  const url = req.shareToken
    ? `/public/share/${encodeURIComponent(req.shareToken)}/file`
    : `/documents/${req.documentId}/file`;
  try {
    const res = await api.get<Blob>(url, {
      responseType: "blob",
      params: {
        ...(req.versionNumber ? { version: req.versionNumber } : {}),
        ...(req.download ? { download: 1 } : {}),
      },
    });
    const blob = res.data;
    return {
      blob,
      name: filenameFrom(res.headers["content-disposition"] as string | undefined, "berkas"),
      type: blob.type,
      size: blob.size,
    };
  } catch (e) {
    // Pratinjau: berkas hilang / tanpa akses → tampilkan fallback. Unduhan: teruskan pesan error.
    if (req.download) throw e;
    return null;
  }
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