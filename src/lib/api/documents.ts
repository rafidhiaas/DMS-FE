import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockStore } from "@/lib/mocks/dms-store";
import type { DocumentItem, DocumentDetail, DocumentVersion } from "@/types";

/** Lapisan akses data Dokumen (mock ↔ backend Express). */

export async function createDocument(input: {
  title: string;
  extension: string;
  size_bytes: number;
  folder_id: string;
}): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.createDocument(input);
  const { data } = await api.post<{ document: DocumentItem }>("/documents", input);
  return data.document;
}

export async function fetchDocument(id: string): Promise<DocumentDetail> {
  if (env.USE_MOCKS) return mockStore.getDocument(id);
  const { data } = await api.get<{ document: DocumentDetail }>(`/documents/${id}`);
  return data.document;
}

export async function renameDocument(id: string, title: string): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.renameDocument(id, title);
  const { data } = await api.patch<{ document: DocumentItem }>(
    `/documents/${id}/rename`,
    { title },
  );
  return data.document;
}

export async function deleteDocument(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockStore.deleteDocument(id);
  await api.delete(`/documents/${id}`);
}

export async function fetchVersionHistory(id: string): Promise<DocumentVersion[]> {
  if (env.USE_MOCKS) return (await mockStore.getDocument(id)).versions;
  const { data } = await api.get<{ versions: DocumentVersion[] }>(
    `/documents/${id}/versions`,
  );
  return data.versions;
}

export async function uploadNewVersion(
  id: string,
  input: { size_bytes: number; changelog?: string; extension?: string },
): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.uploadNewVersion(id, input);
  const { data } = await api.post<{ document: DocumentItem }>(
    `/documents/${id}/versions`,
    input,
  );
  return data.document;
}
