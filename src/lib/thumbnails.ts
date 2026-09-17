import { fetchDocumentFile } from "@/lib/api/files";
import { getThumb, putThumb } from "@/lib/thumb-cache";

/**
 * Thumbnail dokumen untuk kartu daftar (pola kartu Paperless-ngx).
 * Dirender di browser dari berkas asli backend — halaman pertama PDF (pdf.js), gambar
 * diperkecil, berkas teks ditampilkan sebagai cuplikan. Hasil render di-cache di IndexedDB
 * per (dokumen, versi) sehingga berkas hanya diunduh sekali.
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

const RENDERABLE = ["pdf", "png", "jpg", "jpeg", "gif", "webp", "txt", "csv", "md", "json", "log"];
const TEXT_PREFIX = "text:";

/** Thumbnail untuk versi terkini sebuah dokumen. */
export async function fetchThumbnail(
  documentId: string,
  extension: string,
  currentVersion = 1,
): Promise<Thumbnail> {
  const ext = extension.toLowerCase();
  if (typeof window === "undefined" || !RENDERABLE.includes(ext)) return { kind: "none" };

  const key = `${documentId}:v${currentVersion}`;
  const cached = await getThumb(key);
  if (cached) {
    return cached.startsWith(TEXT_PREFIX)
      ? { kind: "text", text: cached.slice(TEXT_PREFIX.length) }
      : { kind: "image", src: cached };
  }

  const file = await fetchDocumentFile({ documentId });
  if (!file) return { kind: "none" };

  if (["txt", "csv", "md", "json", "log"].includes(ext)) {
    try {
      const raw = (await file.blob.text()).slice(0, TEXT_CHARS);
      if (!raw.trim()) return { kind: "none" };
      await putThumb(key, TEXT_PREFIX + raw);
      return { kind: "text", text: raw };
    } catch {
      return { kind: "none" };
    }
  }

  const url = ext === "pdf" ? await renderPdf(file.blob) : await renderImage(file.blob);
  if (!url) return { kind: "none" };
  await putThumb(key, url);
  return { kind: "image", src: url };
}