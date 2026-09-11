import { env } from "@/lib/env";
import { recordActivity } from "@/lib/mocks/audit-store";
import { getFile } from "@/lib/mocks/file-store";
import { findVersionId } from "@/lib/mocks/dms-store";

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

export type DownloadResult = "file" | "placeholder";

/**
 * Unduh dokumen DMS.
 * MOCK: bila berkas asli tersimpan di IndexedDB (diunggah di browser ini) → unduh berkas itu;
 * jika tidak (data contoh) → berkas placeholder agar alur (termasuk audit log) tetap teruji.
 * Saat S3 siap: ganti isi fungsi ini dengan request presigned URL via BFF.
 */
export async function downloadDocument(doc: {
  id: string;
  title: string;
  extension: string;
  current_version: number;
  /** Unduh versi tertentu (default: versi terkini). */
  version_number?: number;
}): Promise<DownloadResult> {
  if (!env.USE_MOCKS) {
    throw new Error("Unduhan berkas asli menunggu integrasi S3 di backend.");
  }
  const version = doc.version_number ?? doc.current_version;
  const versionId = findVersionId(doc.id, version);
  const stored = versionId ? await getFile(versionId) : null;

  if (stored) {
    const suffix = version === doc.current_version ? "" : ` (v${version})`;
    triggerBrowserDownload(stored.blob, `${doc.title}${suffix}.${doc.extension}`);
    recordActivity("DOWNLOAD_DOCUMENT", `Mengunduh dokumen "${doc.title}" (v${version})`, {
      document_id: doc.id,
    });
    return "file";
  }

  const placeholder = [
    "=== SECURE DMS — BERKAS SIMULASI ===",
    "",
    `Judul     : ${doc.title}`,
    `Versi     : ${version}`,
    `Ekstensi  : ${doc.extension}`,
    `Dokumen ID: ${doc.id}`,
    "",
    "Berkas asli tidak tersimpan (data contoh). Unggah versi baru untuk mendapatkan berkas sungguhan.",
  ].join("\n");
  triggerBrowserDownload(placeholder, `${doc.title}.${doc.extension}.txt`);
  recordActivity("DOWNLOAD_DOCUMENT", `Mengunduh dokumen "${doc.title}" (v${version})`, {
    document_id: doc.id,
  });
  return "placeholder";
}

/** Pesan toast sesuai hasil unduhan. */
export function downloadToast(result: DownloadResult): string {
  return result === "file" ? "Berkas diunduh." : "Berkas simulasi diunduh (data contoh tanpa berkas asli).";
}
