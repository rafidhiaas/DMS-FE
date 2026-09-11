/**
 * MOCK indeks isi berkas — pengganti OCR/full-text Paperless untuk berkas teks
 * (txt, csv, md, json, log). Teks diekstrak saat unggah dan disimpan di localStorage
 * (dibatasi 200 KB per dokumen) agar bisa dicari dan ditampilkan di tab Konten.
 * PDF/Office butuh OCR di server — di luar jangkauan mock.
 */

const STORAGE_KEY = "dms_mock_content_v1";
const MAX_CHARS = 200_000;
const TEXT_EXTENSIONS = ["txt", "csv", "md", "json", "log"];

type ContentMap = Record<string, string>;

function load(): ContentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContentMap) : {};
  } catch {
    return {};
  }
}

function save(map: ContentMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* kuota penuh — abaikan, konten hanya untuk pencarian */
  }
}

export function isTextLike(file: { name: string; type?: string }): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TEXT_EXTENSIONS.includes(ext) || (file.type ?? "").startsWith("text/");
}

/** Ekstrak & simpan teks sebuah berkas untuk dokumen (versi terkini). */
export async function indexFileContent(documentId: string, file: File): Promise<void> {
  if (!isTextLike(file)) return;
  try {
    const text = (await file.text()).slice(0, MAX_CHARS);
    const map = load();
    map[documentId] = text;
    save(map);
  } catch {
    /* abaikan */
  }
}

export function getContent(documentId: string): string | null {
  return load()[documentId] ?? null;
}

export function removeContent(documentIds: string[]): void {
  if (documentIds.length === 0) return;
  const map = load();
  let changed = false;
  for (const id of documentIds) {
    if (id in map) {
      delete map[id];
      changed = true;
    }
  }
  if (changed) save(map);
}

/** Cari kata di seluruh konten; kembalikan cuplikan di sekitar kecocokan pertama. */
export function searchContent(query: string): Array<{ documentId: string; snippet: string }> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: Array<{ documentId: string; snippet: string }> = [];
  for (const [id, text] of Object.entries(load())) {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 60);
    const snippet = `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ")}${end < text.length ? "…" : ""}`;
    out.push({ documentId: id, snippet });
  }
  return out;
}
