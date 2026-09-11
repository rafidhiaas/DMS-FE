import { env } from "@/lib/env";
import { getFile, getThumb, putThumb } from "@/lib/mocks/file-store";
import { findVersionId } from "@/lib/mocks/dms-store";
import { getContent } from "@/lib/mocks/content-store";

/**
 * Thumbnail dokumen untuk kartu daftar (pola kartu Paperless-ngx).
 * MOCK: dirender di browser dari berkas di IndexedDB — halaman pertama PDF (pdf.js),
 * gambar diperkecil, berkas teks ditampilkan sebagai cuplikan. Hasil render di-cache.
 * BACKEND: menunggu thumbnail yang dibuat server (usulan `GET /documents/:id/thumbnail`).
 */

export type Thumbnail =
  | { kind: "image"; src: string }
  | { kind: "text"; text: string }
  | { kind: "none" };

const THUMB_WIDTH = 480;
const TEXT_CHARS = 700;

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((lib) => {
      // Worker disalin ke /public saat instalasi (public/pdf.worker.min.mjs).
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsPromise;
}

async function renderPdf(blob: Blob): Promise<string | null> {
  try {
    const pdfjs = await loadPdfjs();
    const data = new Uint8Array(await blob.arrayBuffer());
    const task = pdfjs.getDocument({ data });
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const url = canvas.toDataURL("image/jpeg", 0.82);
    await task.destroy();
    return url;
  } catch {
    return null;
  }
}

async function renderImage(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, THUMB_WIDTH / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

/** Thumbnail untuk versi terkini sebuah dokumen. */
export async function fetchThumbnail(documentId: string, extension: string): Promise<Thumbnail> {
  if (!env.USE_MOCKS || typeof window === "undefined") return { kind: "none" };

  // Berkas teks: cuplikan dari indeks konten (tanpa render gambar).
  const text = getContent(documentId);
  if (text) return { kind: "text", text: text.slice(0, TEXT_CHARS) };

  const versionId = findVersionId(documentId);
  if (!versionId) return { kind: "none" };

  const cached = await getThumb(versionId);
  if (cached) return { kind: "image", src: cached };

  const file = await getFile(versionId);
  if (!file) return { kind: "none" };

  const ext = extension.toLowerCase();
  // Berkas teks yang diunggah sebelum indeks konten ada: baca langsung dari berkasnya.
  if (["txt", "csv", "md", "json", "log"].includes(ext) || file.type.startsWith("text/")) {
    try {
      const raw = (await file.blob.text()).slice(0, TEXT_CHARS);
      if (raw.trim()) return { kind: "text", text: raw };
    } catch {
      /* lanjut ke placeholder */
    }
  }
  let url: string | null = null;
  if (ext === "pdf" || file.type === "application/pdf") url = await renderPdf(file.blob);
  else if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) url = await renderImage(file.blob);

  if (!url) return { kind: "none" };
  await putThumb(versionId, url);
  return { kind: "image", src: url };
}
