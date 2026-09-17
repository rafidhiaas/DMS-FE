import { fetchDocumentFile } from "@/lib/api/files";

/** Picu unduhan file di browser dari konten string/blob. */
export function triggerBrowserDownload(content: string | Blob, filename: string): void {
  const blob = typeof content === "string" ? new Blob([content], { type: "text/plain" }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Unduh berkas asli dokumen dari backend (lewat BFF — token tidak pernah menyentuh JS).
 * Backend mencatat DOWNLOAD_DOCUMENT di audit log dan menolak (403) bila akses hanya VIEWER.
 */
export async function downloadDocument(doc: {
  id: string;
  title: string;
  extension: string;
  current_version: number;
  /** Unduh versi tertentu (default: versi terkini). */
  version_number?: number;
  /** Unduh lewat tautan publik (halaman /share/[token]). */
  share_token?: string;
}): Promise<DownloadResult> {
  const version = doc.version_number ?? doc.current_version;
  const file = await fetchDocumentFile({
    documentId: doc.id,
    versionNumber: doc.share_token ? undefined : version,
    shareToken: doc.share_token,
    download: true,
  });
  if (!file) throw new Error("Berkas tidak ditemukan di server.");

  const suffix = version === doc.current_version ? "" : ` (v${version})`;
  const fallback = `${doc.title}${suffix}.${doc.extension}`;
  triggerBrowserDownload(file.blob, file.name !== "berkas" ? file.name : fallback);
  return "file";
}

export type DownloadResult = "file";

/** Pesan toast setelah unduhan berhasil. */
const DOWNLOAD_MESSAGES: Record<DownloadResult, string> = { file: "Berkas diunduh." };

export function downloadToast(result: DownloadResult): string {
  return DOWNLOAD_MESSAGES[result];
}