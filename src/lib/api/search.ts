import { api } from "@/lib/api/client";
import type { DocumentStatus, SearchResult } from "@/types";
import { unwrap } from "@/lib/api/_transform";

/**
 * Pencarian global folder + dokumen → backend `GET /search?q=`.
 * Server mencari judul, deskripsi, ekstensi, ASN, tag, tipe, pihak, dan isi berkas teks.
 */

const LIMIT = 12;

type BeSearchResult =
  | { kind: "folder"; id: string; name: string; path: string }
  | {
      kind: "document";
      id: string;
      title: string;
      extension: string;
      status: DocumentStatus;
      folderName: string;
      updatedAt: string;
      snippet?: string;
    };

export async function searchAll(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const { data } = await api.get<unknown>("/search", { params: { q: query, limit: LIMIT } });
  return (unwrap<BeSearchResult[]>(data) ?? []).map((r) =>
    r.kind === "folder"
      ? r
      : {
          kind: "document",
          id: r.id,
          title: r.title,
          extension: r.extension,
          status: r.status,
          folder_name: r.folderName,
          updated_at: r.updatedAt,
          snippet: r.snippet,
        },
  );
}