import type { MetaKind, ShareLink } from "@/types";

/** Konstanta & aturan domain yang dipakai UI (nilai mengikuti backend). */

/** Dokumen di Sampah dibersihkan setelah N hari. */
export const TRASH_RETENTION_DAYS = 30;

/** Palet warna tag — hex agar bisa dipakai inline style di terang & gelap. */
export const TAG_COLORS = [
  "#dc2626", // merah
  "#ea580c", // oranye
  "#ca8a04", // kuning
  "#16a34a", // hijau
  "#0d9488", // teal
  "#2563eb", // biru
  "#7c3aed", // ungu
  "#db2777", // pink
  "#64748b", // abu
  "#78350f", // cokelat
] as const;

export const META_LABEL: Record<MetaKind, { singular: string; plural: string }> = {
  tag: { singular: "Tag", plural: "Tag" },
  type: { singular: "Tipe dokumen", plural: "Tipe dokumen" },
  correspondent: { singular: "Pihak", plural: "Pihak" },
};

export function isExpired(link: ShareLink): boolean {
  return link.expires_at !== null && new Date(link.expires_at).getTime() <= Date.now();
}

/** Backend menolak unggahan karena berkas identik (SHA-256) sudah ada — HTTP 409. */
export class DuplicateDocumentError extends Error {
  existing: { id: string; title: string; folder_name: string };
  constructor(existing: { id: string; title: string; folder_name: string }, message?: string) {
    super(message ?? `Berkas identik sudah ada: "${existing.title}" di folder ${existing.folder_name}.`);
    this.name = "DuplicateDocumentError";
    this.existing = existing;
  }
}
