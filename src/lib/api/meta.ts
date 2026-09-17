import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockMetaStore } from "@/lib/mocks/meta-store";
import type { MetaItem, MetaKind } from "@/types";
import { unwrap } from "@/lib/api/_transform";

/**
 * Lapisan akses data metadata (Tag / Tipe Dokumen / Pihak).
 * Backend: `/api/metadata/{tags,document-types,correspondents}` → `{ success, data }` (camelCase).
 */

const PATH: Record<MetaKind, string> = {
  tag: "/metadata/tags",
  type: "/metadata/document-types",
  correspondent: "/metadata/correspondents",
};

/** Bentuk item metadata dari BE (camelCase + hitungan relasi Prisma). */
interface BeMetaItem {
  id: string;
  name: string;
  color?: string | null;
  createdAt?: string;
  _count?: { documents?: number };
}

function mapMeta(m: BeMetaItem): MetaItem {
  return {
    id: m.id,
    name: m.name,
    ...(m.color ? { color: m.color } : {}),
    created_at: m.createdAt ?? "",
    document_count: m._count?.documents,
  };
}

export async function fetchMeta(kind: MetaKind): Promise<MetaItem[]> {
  if (env.USE_MOCKS) return mockMetaStore.list(kind);
  const { data } = await api.get<unknown>(PATH[kind]);
  return (unwrap<BeMetaItem[]>(data) ?? []).map(mapMeta);
}

export async function createMeta(kind: MetaKind, input: { name: string; color?: string }): Promise<MetaItem> {
  if (env.USE_MOCKS) return mockMetaStore.create(kind, input);
  const { data } = await api.post<unknown>(PATH[kind], input);
  return mapMeta(unwrap<BeMetaItem>(data));
}

export async function updateMeta(
  kind: MetaKind,
  id: string,
  patch: { name?: string; color?: string },
): Promise<MetaItem> {
  if (env.USE_MOCKS) return mockMetaStore.update(kind, id, patch);
  const { data } = await api.patch<unknown>(`${PATH[kind]}/${id}`, patch);
  return mapMeta(unwrap<BeMetaItem>(data));
}

export async function deleteMeta(kind: MetaKind, id: string): Promise<void> {
  if (env.USE_MOCKS) return mockMetaStore.remove(kind, id);
  await api.delete(`${PATH[kind]}/${id}`);
}
