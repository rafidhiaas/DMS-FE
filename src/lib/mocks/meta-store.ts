import type { Correspondent, DocumentType, MetaItem, MetaKind, Tag } from "@/types";
import { recordActivity } from "@/lib/mocks/audit-store";
import { detachMeta, peekDocuments } from "@/lib/mocks/dms-store";

/**
 * MOCK store metadata dokumen ala Paperless-ngx: Tag (berwarna), Tipe Dokumen,
 * dan Pihak (korespondensi). Persist di localStorage; backend belum punya entitasnya.
 */

const STORAGE_KEY = "dms_mock_meta_v1";

interface MetaShape {
  tags: Tag[];
  types: DocumentType[];
  correspondents: Correspondent[];
}

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

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `meta-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function seed(): MetaShape {
  return {
    tags: [
      { id: "seed-tag-penting", name: "Penting", color: "#dc2626", created_at: nowIso(40) },
      { id: "seed-tag-keuangan", name: "Keuangan", color: "#16a34a", created_at: nowIso(40) },
      { id: "seed-tag-kontrak", name: "Kontrak", color: "#2563eb", created_at: nowIso(40) },
      { id: "seed-tag-rahasia", name: "Rahasia", color: "#7c3aed", created_at: nowIso(30) },
      { id: "seed-tag-2025", name: "2025", color: "#64748b", created_at: nowIso(20) },
    ],
    types: [
      { id: "seed-type-laporan", name: "Laporan", created_at: nowIso(40) },
      { id: "seed-type-kontrak", name: "Kontrak", created_at: nowIso(40) },
      { id: "seed-type-surat", name: "Surat", created_at: nowIso(40) },
      { id: "seed-type-anggaran", name: "Anggaran", created_at: nowIso(30) },
    ],
    correspondents: [
      { id: "seed-corr-mitra", name: "PT Mitra Sejahtera", created_at: nowIso(40) },
      { id: "seed-corr-bank", name: "Bank Nusantara", created_at: nowIso(40) },
      { id: "seed-corr-pajak", name: "Kantor Pajak Pratama", created_at: nowIso(30) },
    ],
  };
}

function load(): MetaShape {
  if (typeof window === "undefined") return { tags: [], types: [], correspondents: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as MetaShape;
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function save(data: MetaShape): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function delay<T>(value: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const KEY: Record<MetaKind, keyof MetaShape> = {
  tag: "tags",
  type: "types",
  correspondent: "correspondents",
};

export const META_LABEL: Record<MetaKind, { singular: string; plural: string }> = {
  tag: { singular: "Tag", plural: "Tag" },
  type: { singular: "Tipe dokumen", plural: "Tipe dokumen" },
  correspondent: { singular: "Pihak", plural: "Pihak" },
};

/** Jumlah dokumen aktif yang memakai item metadata ini. */
function usageCount(kind: MetaKind, id: string): number {
  const docs = peekDocuments();
  if (kind === "tag") return docs.filter((d) => (d.tag_ids ?? []).includes(id)).length;
  if (kind === "type") return docs.filter((d) => d.document_type_id === id).length;
  return docs.filter((d) => d.correspondent_id === id).length;
}

/** Baca sinkron (untuk pencarian/tampilan chip tanpa fetch). */
export function peekMeta(kind: MetaKind): MetaItem[] {
  return load()[KEY[kind]] as MetaItem[];
}

export const mockMetaStore = {
  async list(kind: MetaKind): Promise<MetaItem[]> {
    const items = (load()[KEY[kind]] as MetaItem[])
      .map((it) => ({ ...it, document_count: usageCount(kind, it.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return delay(items);
  },

  async create(kind: MetaKind, input: { name: string; color?: string }): Promise<MetaItem> {
    const name = input.name.trim();
    if (!name) throw new Error("Nama tidak boleh kosong.");
    const data = load();
    const list = data[KEY[kind]] as MetaItem[];
    if (list.some((it) => it.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`${META_LABEL[kind].singular} "${name}" sudah ada.`);
    }
    const item: MetaItem = {
      id: uuid(),
      name,
      created_at: new Date().toISOString(),
      ...(kind === "tag" ? { color: input.color ?? TAG_COLORS[list.length % TAG_COLORS.length] } : {}),
    };
    list.push(item);
    save(data);
    recordActivity("CREATE_META", `Membuat ${META_LABEL[kind].singular.toLowerCase()} "${name}"`);
    return delay({ ...item, document_count: 0 });
  },

  async update(kind: MetaKind, id: string, patch: { name?: string; color?: string }): Promise<MetaItem> {
    const data = load();
    const list = data[KEY[kind]] as MetaItem[];
    const item = list.find((it) => it.id === id);
    if (!item) throw new Error("Item tidak ditemukan.");
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new Error("Nama tidak boleh kosong.");
      if (list.some((it) => it.id !== id && it.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`${META_LABEL[kind].singular} "${name}" sudah ada.`);
      }
      item.name = name;
    }
    if (kind === "tag" && patch.color) item.color = patch.color;
    save(data);
    recordActivity("UPDATE_META", `Mengubah ${META_LABEL[kind].singular.toLowerCase()} "${item.name}"`);
    return delay({ ...item, document_count: usageCount(kind, id) });
  },

  async remove(kind: MetaKind, id: string): Promise<void> {
    const data = load();
    const list = data[KEY[kind]] as MetaItem[];
    const item = list.find((it) => it.id === id);
    if (!item) throw new Error("Item tidak ditemukan.");
    (data[KEY[kind]] as MetaItem[]) = list.filter((it) => it.id !== id);
    save(data);
    detachMeta(kind, id);
    recordActivity("DELETE_META", `Menghapus ${META_LABEL[kind].singular.toLowerCase()} "${item.name}"`);
    return delay(undefined);
  },
};
