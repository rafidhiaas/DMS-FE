import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockStore } from "@/lib/mocks/dms-store";
import type {
  DocumentItem,
  DocumentDetail,
  DocumentVersion,
  TrashItem,
  DocumentMetaPatch,
  BulkMetaPatch,
} from "@/types";

/** Lapisan akses data Dokumen (mock ↔ backend Express). */

export async function createDocument(input: {
  title: string;
  extension: string;
  size_bytes: number;
  folder_id: string;
  /** Berkas asli — mock menyimpannya ke IndexedDB; backend belum menerima upload (S3 pending). */
  file?: File;
}): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.createDocument(input);
  const { file: _file, ...body } = input;
  void _file;
  const { data } = await api.post<{ document: DocumentItem }>("/documents", body);
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
  input: { size_bytes: number; changelog?: string; extension?: string; file?: File },
): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.uploadNewVersion(id, input);
  const { file: _file, ...body } = input;
  void _file;
  const { data } = await api.post<{ document: DocumentItem }>(
    `/documents/${id}/versions`,
    body,
  );
  return data.document;
}

/* ------------------------------- Sampah ---------------------------------
 * Backend menghapus permanen (DELETE /documents/:id) dan belum punya soft delete.
 * Di mode backend fungsi-fungsi ini mengembalikan null / melempar error yang jelas.
 * Usulan endpoint: GET /documents/trash, POST /documents/:id/restore,
 * DELETE /documents/:id/purge, DELETE /documents/trash.
 * ----------------------------------------------------------------------- */

export async function fetchTrash(): Promise<TrashItem[] | null> {
  if (env.USE_MOCKS) return mockStore.getTrash();
  return null;
}

export async function restoreDocument(id: string): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.restoreDocument(id);
  const { data } = await api.post<{ document: DocumentItem }>(`/documents/${id}/restore`);
  return data.document;
}

export async function purgeDocument(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockStore.purgeDocument(id);
  await api.delete(`/documents/${id}/purge`);
}

export async function emptyTrash(): Promise<number> {
  if (env.USE_MOCKS) return mockStore.emptyTrash();
  const { data } = await api.delete<{ purged: number }>("/documents/trash");
  return data.purged;
}

/** Pindahkan dokumen ke folder lain. Backend belum punya endpoint (usulan: PATCH /documents/:id/move). */
export async function moveDocument(id: string, folder_id: string): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.moveDocument(id, folder_id);
  const { data } = await api.patch<{ document: DocumentItem }>(`/documents/${id}/move`, {
    folder_id,
  });
  return data.document;
}

/* ------------------------------- Metadata --------------------------------
 * Backend belum punya kolom tag/tipe/pihak/tanggal/ASN/deskripsi pada Document.
 * Usulan endpoint: PATCH /documents/:id/meta, POST /documents/bulk-meta.
 * ----------------------------------------------------------------------- */

export async function updateDocumentMeta(id: string, patch: DocumentMetaPatch): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.updateDocumentMeta(id, patch);
  const { data } = await api.patch<{ document: DocumentItem }>(`/documents/${id}/meta`, patch);
  return data.document;
}

export async function bulkUpdateMeta(ids: string[], patch: BulkMetaPatch): Promise<number> {
  if (env.USE_MOCKS) return mockStore.bulkUpdateMeta(ids, patch);
  const { data } = await api.post<{ updated: number }>("/documents/bulk-meta", { ids, ...patch });
  return data.updated;
}
