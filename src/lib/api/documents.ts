import { api, type ApiError } from "@/lib/api/client";
import { DuplicateDocumentError, TRASH_RETENTION_DAYS } from "@/lib/domain";
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
import { mapDocument, mapVersion, unwrap, type BeDocument, type BeVersion } from "@/lib/api/_transform";

/** Lapisan akses data Dokumen → backend Express `/api/documents` (lewat BFF). */

/** Batas atas daftar: BE memaginasi, FE memfilter/mengurutkan di klien. */
const LIST_LIMIT = 1000;

// ============ CREATE ============
export async function createDocument(input: {
  title: string;
  description?: string;
  extension: string;
  size_bytes: number;
  folder_id: string;
  /** Berkas asli — wajib di backend. */
  file?: File;
  /** Lewati peringatan duplikat (checksum sama) — pengguna sudah mengonfirmasi. */
  allow_duplicate?: boolean;
}): Promise<DocumentItem> {
  if (!input.file) throw new Error("Pilih berkas yang akan diunggah.");

  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("title", input.title);
  formData.append("folderId", input.folder_id);
  if (input.description) formData.append("description", input.description);
  if (input.allow_duplicate) formData.append("allowDuplicate", "true");

  try {
    const { data } = await api.post<unknown>("/documents", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
  } catch (e) {
    const err = e as ApiError;
    if (err.code === "DUPLICATE_DOCUMENT") {
      const existing = (err.data as { existing?: { id: string; title: string; folderName: string } })
        ?.existing;
      if (existing) {
        throw new DuplicateDocumentError(
          { id: existing.id, title: existing.title, folder_name: existing.folderName },
          err.message,
        );
      }
    }
    throw e;
  }
}

// ============ READ ============
export async function fetchDocument(id: string): Promise<DocumentDetail> {
  const { data } = await api.get<unknown>(`/documents/${id}`);
  return mapDocument(unwrap<BeDocument>(data)) as DocumentDetail;
}

// ============ UPDATE / RENAME ============
export async function renameDocument(id: string, title: string): Promise<DocumentItem> {
  const { data } = await api.patch<unknown>(`/documents/${id}`, { title });
  return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
}

// ============ DELETE (soft) ============
export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

// ============ VERSIONS ============
export async function fetchVersionHistory(id: string): Promise<DocumentVersion[]> {
  const { data } = await api.get<unknown>(`/documents/${id}/versions`);
  return (unwrap<BeVersion[]>(data) ?? []).map(mapVersion) as DocumentVersion[];
}

export async function uploadNewVersion(
  id: string,
  input: { size_bytes: number; changelog?: string; extension?: string; file?: File },
): Promise<DocumentItem> {
  if (!input.file) throw new Error("Pilih berkas versi baru.");

  const formData = new FormData();
  formData.append("file", input.file);
  if (input.changelog) formData.append("changelog", input.changelog);

  const { data } = await api.post<unknown>(`/documents/${id}/versions`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
}

// ============ TRASH ============
export async function fetchTrash(): Promise<TrashItem[]> {
  const { data } = await api.get<unknown>("/documents/trash");
  const items = unwrap<BeDocument[]>(data) ?? [];
  return items.map((d) => {
    // BE tidak mengirim jadwal pembersihan — dihitung dari deletedAt.
    const deletedAt = d.deletedAt ?? new Date().toISOString();
    return {
      ...mapDocument(d),
      deleted_at: deletedAt,
      folder_name: d.folder?.name ?? "—",
      purge_at: new Date(
        new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * 86_400_000,
      ).toISOString(),
    };
  }) as TrashItem[];
}

export async function restoreDocument(id: string): Promise<DocumentItem> {
  const { data } = await api.post<unknown>(`/documents/${id}/restore`);
  return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
}

export async function purgeDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}/purge`);
}

export async function emptyTrash(): Promise<number> {
  const { data } = await api.delete<unknown>("/documents/trash");
  return unwrap<{ count?: number } | null>(data)?.count ?? 0;
}

// ============ MOVE ============
export async function moveDocument(id: string, folder_id: string): Promise<DocumentItem> {
  const { data } = await api.patch<unknown>(`/documents/${id}/move`, { folderId: folder_id });
  return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
}

// ============ METADATA ============
export async function updateDocumentMeta(
  id: string,
  patch: DocumentMetaPatch,
): Promise<DocumentItem> {
  const bePatch: Record<string, unknown> = {};
  if (patch.tag_ids !== undefined) bePatch.tagIds = patch.tag_ids;
  if (patch.document_type_id !== undefined) bePatch.documentTypeId = patch.document_type_id;
  if (patch.correspondent_id !== undefined) bePatch.correspondentId = patch.correspondent_id;
  if (patch.document_date !== undefined) bePatch.documentDate = patch.document_date;
  if (patch.asn !== undefined) bePatch.asn = patch.asn;
  if (patch.description !== undefined) bePatch.description = patch.description;
  if (patch.custom_fields !== undefined) bePatch.customFields = patch.custom_fields;

  const { data } = await api.patch<unknown>(`/documents/${id}/meta`, bePatch);
  return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
}

export async function bulkUpdateMeta(ids: string[], patch: BulkMetaPatch): Promise<number> {
  const bePatch: Record<string, unknown> = { ids };
  if (patch.add_tag_ids !== undefined) bePatch.addTagIds = patch.add_tag_ids;
  if (patch.remove_tag_ids !== undefined) bePatch.removeTagIds = patch.remove_tag_ids;
  if (patch.document_type_id !== undefined) bePatch.documentTypeId = patch.document_type_id;
  if (patch.correspondent_id !== undefined) bePatch.correspondentId = patch.correspondent_id;

  const { data } = await api.post<unknown>("/documents/bulk-meta", bePatch);
  return unwrap<{ updated?: unknown[] } | null>(data)?.updated?.length ?? 0;
}

// ============ LIST ALL DOCUMENTS ============
export async function fetchAllDocuments(): Promise<DocumentListItem[]> {
  const { data } = await api.get<unknown>("/documents", { params: { limit: LIST_LIMIT } });
  const docs = unwrap<{ documents?: BeDocument[] } | null>(data)?.documents ?? [];
  return docs.map((d) => ({
    ...mapDocument(d),
    folder_name: d.folder?.name ?? "—",
  })) as DocumentListItem[];
}

// ============ STATUS ============
/** `note` = alasan (wajib saat menolak); backend juga menyimpannya sebagai catatan dokumen. */
export async function setDocumentStatus(
  id: string,
  status: DocumentStatus,
  note?: string,
): Promise<DocumentItem> {
  const { data } = await api.patch<unknown>(`/documents/${id}/status`, {
    status,
    reason: note,
  });
  return mapDocument(unwrap<BeDocument>(data)) as DocumentItem;
}

export async function bulkSetStatus(
  ids: string[],
  status: DocumentStatus,
): Promise<{ changed: number; skipped: number }> {
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

/** Apakah error dari createDocument adalah peringatan duplikat (bawa info dokumen yang sudah ada). */
export function asDuplicateError(e: unknown): DuplicateDocumentError | null {
  return e instanceof DuplicateDocumentError ? e : null;
}

/** Teks terindeks sebuah dokumen (berkas teks; null untuk PDF/gambar — belum ada OCR). */
export async function fetchDocumentContent(documentId: string): Promise<string | null> {
  const { data } = await api.get<unknown>(`/documents/${documentId}/content`);
  return unwrap<{ content?: string | null } | null>(data)?.content ?? null;
}
