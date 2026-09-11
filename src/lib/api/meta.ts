import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockMetaStore } from "@/lib/mocks/meta-store";
import type { MetaItem, MetaKind } from "@/types";

/**
 * Lapisan akses data metadata (Tag / Tipe Dokumen / Pihak).
 * Backend belum punya entitas ini; path di bawah adalah usulan bentuk REST
 * (`/tags`, `/document-types`, `/correspondents` → `{ items }`).
 */

const PATH: Record<MetaKind, string> = {
  tag: "/tags",
  type: "/document-types",
  correspondent: "/correspondents",
};

export async function fetchMeta(kind: MetaKind): Promise<MetaItem[]> {
  if (env.USE_MOCKS) return mockMetaStore.list(kind);
  const { data } = await api.get<{ items: MetaItem[] }>(PATH[kind]);
  return data.items;
}

export async function createMeta(kind: MetaKind, input: { name: string; color?: string }): Promise<MetaItem> {
  if (env.USE_MOCKS) return mockMetaStore.create(kind, input);
  const { data } = await api.post<{ item: MetaItem }>(PATH[kind], input);
  return data.item;
}

export async function updateMeta(
  kind: MetaKind,
  id: string,
  patch: { name?: string; color?: string },
): Promise<MetaItem> {
  if (env.USE_MOCKS) return mockMetaStore.update(kind, id, patch);
  const { data } = await api.patch<{ item: MetaItem }>(`${PATH[kind]}/${id}`, patch);
  return data.item;
}

export async function deleteMeta(kind: MetaKind, id: string): Promise<void> {
  if (env.USE_MOCKS) return mockMetaStore.remove(kind, id);
  await api.delete(`${PATH[kind]}/${id}`);
}
