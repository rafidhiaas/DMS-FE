import type { DocumentItem, DocumentStatus, Folder } from "@/types";

/**
 * Filter & urutan daftar isi folder — dihitung di client karena backend
 * belum punya parameter filter/sort pada GET /folders/:id.
 */

export type SortKey = "name" | "updated" | "size";
export type ViewMode = "grid" | "table";

export const VIEW_MODES: readonly ViewMode[] = ["grid", "table"];

export interface ListFilters {
  query: string;
  statuses: DocumentStatus[];
  extensions: string[];
  sort: SortKey;
  /** Metadata ala Paperless — dokumen harus memiliki SALAH SATU id yang dipilih. */
  tagIds: string[];
  typeIds: string[];
  correspondentIds: string[];
}

export const EMPTY_FILTERS: ListFilters = {
  query: "",
  statuses: [],
  extensions: [],
  sort: "name",
  tagIds: [],
  typeIds: [],
  correspondentIds: [],
};

/** Lengkapi filter lama (mis. dari Tampilan Tersimpan versi sebelumnya) dengan kunci baru. */
export function normalizeFilters(f: Partial<ListFilters> | undefined): ListFilters {
  return { ...EMPTY_FILTERS, ...(f ?? {}) };
}

function hasMetaFilters(f: ListFilters): boolean {
  return f.tagIds.length > 0 || f.typeIds.length > 0 || f.correspondentIds.length > 0;
}

export const SORT_LABELS: Record<SortKey, string> = {
  name: "Nama (A–Z)",
  updated: "Terbaru diperbarui",
  size: "Ukuran terbesar",
};

export function hasActiveFilters(f: ListFilters): boolean {
  return f.query.trim() !== "" || f.statuses.length > 0 || f.extensions.length > 0 || hasMetaFilters(f);
}

/** Filter tanpa kata kunci & urutan (untuk tombol Reset). */
export function clearedFilters(f: ListFilters): ListFilters {
  return { ...EMPTY_FILTERS, sort: f.sort };
}

function matchesQuery(text: string, q: string): boolean {
  return q === "" || text.toLowerCase().includes(q);
}

export function applyFolderFilters(folders: Folder[], f: ListFilters): Folder[] {
  const q = f.query.trim().toLowerCase();
  // Filter status/ekstensi hanya relevan untuk dokumen; saat aktif, folder disembunyikan
  // supaya hasil yang tampil benar-benar hanya yang cocok.
  if (f.statuses.length > 0 || f.extensions.length > 0 || hasMetaFilters(f)) return [];
  const out = folders.filter((x) => matchesQuery(x.name, q));
  if (f.sort === "updated") out.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  else out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export function applyDocumentFilters(docs: DocumentItem[], f: ListFilters): DocumentItem[] {
  const q = f.query.trim().toLowerCase();
  const out = docs.filter(
    (d) =>
      matchesQuery(d.title, q) &&
      (f.statuses.length === 0 || f.statuses.includes(d.status)) &&
      (f.extensions.length === 0 || f.extensions.includes(d.extension)) &&
      (f.tagIds.length === 0 || (d.tag_ids ?? []).some((t) => f.tagIds.includes(t))) &&
      (f.typeIds.length === 0 || (d.document_type_id != null && f.typeIds.includes(d.document_type_id))) &&
      (f.correspondentIds.length === 0 ||
        (d.correspondent_id != null && f.correspondentIds.includes(d.correspondent_id))),
  );
  if (f.sort === "updated") out.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  else if (f.sort === "size") out.sort((a, b) => Number(b.size_bytes) - Number(a.size_bytes));
  else out.sort((a, b) => a.title.localeCompare(b.title));
  return out;
}

/** Ekstensi yang benar-benar ada di folder ini (untuk isi dropdown filter). */
export function extensionsIn(docs: DocumentItem[]): string[] {
  return Array.from(new Set(docs.map((d) => d.extension))).sort();
}
