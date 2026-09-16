import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockStore, DuplicateDocumentError } from "@/lib/mocks/dms-store";
import { getContent } from "@/lib/mocks/content-store";
import type {
  DocumentItem,
  DocumentDetail,
  DocumentVersion,
  TrashItem,
  DocumentMetaPatch,
  BulkMetaPatch,
  DocumentListItem,
  DocumentStatus,
} from "@/types";
import { fetchAllFolders, fetchFolderContents } from "@/lib/api/folders";
import { mockNotesStore } from "@/lib/mocks/notes-store";
import { mapDocument, mapVersion, unwrap } from "@/lib/api/_transform";

// ============ CREATE ============
export async function createDocument(input: {
  title: string;
  description?: string;
  extension: string;
  size_bytes: number;
  folder_id: string;
  file?: File;
  allow_duplicate?: boolean;
}): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.createDocument(input);

  const formData = new FormData();
  if (input.file) formData.append("file", input.file);
  formData.append("title", input.title);
  formData.append("folderId", input.folder_id);
  if (input.description) formData.append("description", input.description);

  const { data } = await api.post<any>("/documents", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const doc = unwrap<any>(data);
  return mapDocument(doc) as DocumentItem;
}

// ============ READ ============
export async function fetchDocument(id: string): Promise<DocumentDetail> {
  if (env.USE_MOCKS) return mockStore.getDocument(id);
  const { data } = await api.get<any>(`/documents/${id}`);
  return mapDocument(unwrap<any>(data)) as DocumentDetail;
}

// ============ UPDATE / RENAME ============
export async function renameDocument(id: string, title: string): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.renameDocument(id, title);
  const { data } = await api.patch<any>(`/documents/${id}`, { title });
  const doc = unwrap<any>(data);
  return mapDocument(doc) as DocumentItem;
}

// ============ DELETE (soft) ============
export async function deleteDocument(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockStore.deleteDocument(id);
  await api.delete(`/documents/${id}`);
}

// ============ VERSIONS ============
export async function fetchVersionHistory(id: string): Promise<DocumentVersion[]> {
  if (env.USE_MOCKS) return (await mockStore.getDocument(id)).versions;
  const { data } = await api.get<any>(`/documents/${id}/versions`);
  const versions = unwrap<any[]>(data);
  return (versions ?? []).map(mapVersion) as DocumentVersion[];
}

export async function uploadNewVersion(
  id: string,
  input: { size_bytes: number; changelog?: string; extension?: string; file?: File },
): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.uploadNewVersion(id, input);

  const formData = new FormData();
  if (input.file) formData.append("file", input.file);
  if (input.changelog) formData.append("changelog", input.changelog);

  const { data } = await api.post<any>(`/documents/${id}/versions`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const doc = unwrap<any>(data);
  return mapDocument(doc) as DocumentItem;
}

// ============ TRASH ============
export async function fetchTrash(): Promise<TrashItem[] | null> {
  if (env.USE_MOCKS) return mockStore.getTrash();
  try {
    const { data } = await api.get<any>("/documents/trash");
    const items = unwrap<any[]>(data) ?? [];
    return items.map((d: any) => ({
      ...mapDocument(d),
      deleted_at: d.deletedAt,
    })) as any;
  } catch {
    return null;
  }
}

export async function restoreDocument(id: string): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.restoreDocument(id);
  await api.post(`/documents/${id}/restore`);
  return fetchDocument(id) as Promise<DocumentItem>;
}

export async function purgeDocument(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockStore.purgeDocument(id);
  await api.delete(`/documents/${id}/purge`);
}

export async function emptyTrash(): Promise<number> {
  if (env.USE_MOCKS) return mockStore.emptyTrash();
  const { data } = await api.delete<any>("/documents/trash");
  const payload = unwrap<any>(data);
  return payload?.count ?? 0;
}

// ============ MOVE ============
export async function moveDocument(id: string, folder_id: string): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.moveDocument(id, folder_id);
  const { data } = await api.patch<any>(`/documents/${id}`, { folderId: folder_id });
  const doc = unwrap<any>(data);
  return mapDocument(doc) as DocumentItem;
}

// ============ METADATA ============
export async function updateDocumentMeta(
  id: string,
  patch: DocumentMetaPatch,
): Promise<DocumentItem> {
  if (env.USE_MOCKS) return mockStore.updateDocumentMeta(id, patch);

  const bePatch: any = {};
  if (patch.tag_ids !== undefined) bePatch.tagIds = patch.tag_ids;
  if (patch.document_type_id !== undefined) bePatch.documentTypeId = patch.document_type_id;
  if (patch.correspondent_id !== undefined) bePatch.correspondentId = patch.correspondent_id;
  if (patch.document_date !== undefined) bePatch.documentDate = patch.document_date;
  if (patch.asn !== undefined) bePatch.asn = patch.asn;
  if (patch.description !== undefined) bePatch.description = patch.description;

  const { data } = await api.patch<any>(`/documents/${id}/meta`, bePatch);
  const doc = unwrap<any>(data);
  return mapDocument(doc) as DocumentItem;
}

export async function bulkUpdateMeta(ids: string[], patch: BulkMetaPatch): Promise<number> {
  if (env.USE_MOCKS) return mockStore.bulkUpdateMeta(ids, patch);

  const p = patch as any;
  const bePatch: any = { ids };

  // Handle berbagai kemungkinan shape
  if (p.add_tag_ids !== undefined) bePatch.addTagIds = p.add_tag_ids;
  if (p.remove_tag_ids !== undefined) bePatch.removeTagIds = p.remove_tag_ids;
  if (p.tag_ids !== undefined) bePatch.addTagIds = p.tag_ids; // fallback
  if (p.document_type_id !== undefined) bePatch.documentTypeId = p.document_type_id;
  if (p.correspondent_id !== undefined) bePatch.correspondentId = p.correspondent_id;

  const { data } = await api.post<any>("/documents/bulk-meta", bePatch);
  const payload = unwrap<any>(data);
  return payload?.updated?.length ?? 0;
}

// ============ LIST ALL DOCUMENTS ============
export async function fetchAllDocuments(): Promise<DocumentListItem[]> {
  if (env.USE_MOCKS) return mockStore.listAllDocuments();

  const { data } = await api.get<any>("/documents", {
    params: { limit: 500 },
  });
  const payload = unwrap<any>(data);
  const docs = payload?.documents ?? [];

  return docs
    .map((d: any) => ({
      ...mapDocument(d),
      folder_name: d.folder?.name ?? "—",
    }))
    .filter(Boolean) as DocumentListItem[];
}

// ============ STATUS ============
export async function setDocumentStatus(
  id: string,
  status: DocumentStatus,
  note?: string,
): Promise<DocumentItem> {
  if (env.USE_MOCKS) {
    const doc = await mockStore.setStatus(id, status, note);
    if (note)
      await mockNotesStore.add(id, `[${status === "DRAFT" ? "Ditolak" : "Status"}] ${note}`);
    return doc;
  }
  const { data } = await api.patch<any>(`/documents/${id}/status`, {
    status,
    reason: note,
  });
  const doc = unwrap<any>(data);
  return mapDocument(doc) as DocumentItem;
}

export async function bulkSetStatus(
  ids: string[],
  status: DocumentStatus,
): Promise<{ changed: number; skipped: number }> {
  if (env.USE_MOCKS) return mockStore.bulkSetStatus(ids, status);
  let changed = 0;
  let skipped = 0;
  for (const id of ids) {
    try {
      await setDocumentStatus(id, status);
      changed += 1;
    } catch {
      skipped += 1;
    }
  }
  return { changed, skipped };
}

export function asDuplicateError(e: unknown): DuplicateDocumentError | null {
  return e instanceof DuplicateDocumentError ? e : null;
}

export async function fetchDocumentContent(documentId: string): Promise<string | null> {
  if (!env.USE_MOCKS) return null;
  return getContent(documentId);
}