import { env } from "@/lib/env";
import { recordActivity } from "@/lib/mocks/audit-store";

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
 * Unduh dokumen DMS.
 * MOCK: backend belum punya integrasi S3/presigned URL, jadi kita hasilkan
 * berkas placeholder agar alur unduh (termasuk audit log) bisa diuji end-to-end.
 * Saat S3 siap: ganti isi fungsi ini dengan request presigned URL via BFF.
 */
export async function downloadDocument(doc: {
  id: string;
  title: string;
  extension: string;
  current_version: number;
}): Promise<void> {
  if (!env.USE_MOCKS) {
    throw new Error("Unduhan berkas asli menunggu integrasi S3 di backend.");
  }
  const placeholder = [
    "=== SECURE DMS — BERKAS SIMULASI ===",
    "",
    `Judul     : ${doc.title}`,
    `Versi     : ${doc.current_version}`,
    `Ekstensi  : ${doc.extension}`,
    `Dokumen ID: ${doc.id}`,
    "",
    "Berkas asli akan tersedia setelah backend terintegrasi dengan Object Storage (S3).",
  ].join("\n");
  triggerBrowserDownload(placeholder, `${doc.title}.${doc.extension}.txt`);
  recordActivity("DOWNLOAD_DOCUMENT", `Mengunduh dokumen "${doc.title}" (v${doc.current_version})`, {
    document_id: doc.id,
  });
}
