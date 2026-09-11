import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { peekDocuments, peekFolders } from "@/lib/mocks/dms-store";
import { peekMeta } from "@/lib/mocks/meta-store";
import type { Folder, SearchResult } from "@/types";

/**
 * Pencarian global folder + dokumen.
 * Backend belum punya endpoint search (lihat backend-gaps); mode mock mencari
 * di store lokal. Path /search disiapkan agar tinggal disambungkan.
 */

const LIMIT = 12;

function folderPath(folder: Folder, all: Folder[]): string {
  const names: string[] = [];
  let cur: Folder | undefined = folder;
  while (cur?.parent_folder_id) {
    const parent = all.find((f) => f.id === cur!.parent_folder_id);
    if (!parent) break;
    names.unshift(parent.name);
    cur = parent;
  }
  return names.length ? names.join(" / ") : "Root";
}

/** Skor sederhana: awalan kata > mengandung. Aksen & tanda baca diabaikan. */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9 ]+/gi, " ")
    .toLowerCase()
    .trim();
}

function score(text: string, q: string): number {
  const t = normalize(text);
  if (!t.includes(q)) return 0;
  if (t === q) return 3;
  if (t.startsWith(q) || t.includes(` ${q}`)) return 2;
  return 1;
}

async function mockSearch(query: string): Promise<SearchResult[]> {
  const q = normalize(query);
  if (!q) return [];
  const folders = peekFolders();
  const documents = peekDocuments();
  const tags = peekMeta("tag");
  const types = peekMeta("type");
  const correspondents = peekMeta("correspondent");

  const scored: Array<{ s: number; r: SearchResult }> = [];
  for (const f of folders) {
    const s = score(f.name, q);
    if (s) scored.push({ s, r: { kind: "folder", id: f.id, name: f.name, path: folderPath(f, folders) } });
  }
  for (const d of documents) {
    const tagScore = Math.max(0, ...(d.tag_ids ?? []).map((id) => score(tags.find((t) => t.id === id)?.name ?? "", q)));
    const typeScore = score(types.find((t) => t.id === d.document_type_id)?.name ?? "", q);
    const corrScore = score(correspondents.find((c) => c.id === d.correspondent_id)?.name ?? "", q);
    const s = Math.max(
      score(d.title, q),
      score(d.extension, q) * 0.5,
      score(d.description ?? "", q) * 0.6,
      tagScore * 0.8,
      typeScore * 0.7,
      corrScore * 0.7,
      d.asn != null && String(d.asn) === q ? 3 : 0,
    );
    if (s) {
      const folder = folders.find((f) => f.id === d.folder_id);
      scored.push({
        s,
        r: {
          kind: "document",
          id: d.id,
          title: d.title,
          extension: d.extension,
          status: d.status,
          folder_name: folder?.name ?? "-",
          updated_at: d.updated_at,
        },
      });
    }
  }
  scored.sort((a, b) => b.s - a.s);
  const results = scored.slice(0, LIMIT).map((x) => x.r);
  return new Promise((resolve) => setTimeout(() => resolve(results), 120));
}

export async function searchAll(query: string): Promise<SearchResult[]> {
  if (env.USE_MOCKS) return mockSearch(query);
  const { data } = await api.get<{ results: SearchResult[] }>("/search", {
    params: { q: query, limit: LIMIT },
  });
  return data.results;
}
