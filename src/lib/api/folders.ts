import { api } from "@/lib/api/client";
import type { DocumentItem, Folder, FolderContents } from "@/types";
import {
  mapFolder,
  mapDocument,
  unwrap,
  type BeDocument,
  type BeFolder,
} from "@/lib/api/_transform";

/**
 * Lapisan akses data Folder → backend Express `/api/folders` (lewat BFF).
 * Hierarki disusun di klien dari daftar datar `GET /folders/all`
 * (tree `GET /folders` di backend hanya sampai 3 tingkat).
 */

async function fetchFlat(): Promise<Folder[]> {
  const { data } = await api.get<unknown>("/folders/all");
  return (unwrap<BeFolder[]>(data) ?? []).map(mapFolder) as Folder[];
}

// ============ READ ============
export async function fetchFolderContents(folderId: string): Promise<FolderContents> {
  const folders = await fetchFlat();

  if (folderId === "root") {
    return {
      folderId: null,
      // Induk yang tidak terlihat (mis. milik user lain) → tampil di tingkat atas.
      subFolders: folders.filter(
        (f) => !f.parent_folder_id || !folders.some((p) => p.id === f.parent_folder_id),
      ),
      documents: [],
    };
  }

  const docsRes = await api.get<unknown>("/documents", {
    params: { folderId, limit: 1000 },
  });
  const docsPayload = unwrap<{ documents?: BeDocument[] } | null>(docsRes.data);

  return {
    folderId,
    subFolders: folders.filter((f) => f.parent_folder_id === folderId),
    documents: (docsPayload?.documents ?? []).map(mapDocument) as DocumentItem[],
  };
}

/** Jalur dari root ke folder (termasuk folder itu sendiri) untuk breadcrumb. */
export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  if (folderId === "root") return [];
  const folders = await fetchFlat();
  const path: Folder[] = [];
  let cur = folders.find((f) => f.id === folderId);
  while (cur && path.length < 50) {
    path.unshift(cur);
    const parentId: string | null = cur.parent_folder_id;
    cur = parentId ? folders.find((f) => f.id === parentId) : undefined;
  }
  return path;
}

// ============ CREATE ============
export async function createFolder(input: {
  name: string;
  parent_folder_id: string | null;
  description?: string;
}): Promise<Folder> {
  const { data } = await api.post<unknown>("/folders", {
    name: input.name,
    description: input.description,
    // BE: optional (bukan nullable) → jangan kirim null untuk Root
    ...(input.parent_folder_id ? { parentFolderId: input.parent_folder_id } : {}),
  });
  return mapFolder(unwrap<BeFolder>(data)) as Folder;
}

// ============ UPDATE ============
export async function renameFolder(id: string, name: string): Promise<Folder> {
  const { data } = await api.patch<unknown>(`/folders/${id}/rename`, { name });
  return mapFolder(unwrap<BeFolder>(data)) as Folder;
}

/** `newParentId` null = pindah ke Root. */
export async function moveFolder(id: string, newParentId: string | null): Promise<Folder> {
  const { data } = await api.patch<unknown>(`/folders/${id}/move`, {
    parentFolderId: newParentId,
  });
  return mapFolder(unwrap<BeFolder>(data)) as Folder;
}

// ============ DELETE ============
export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/folders/${id}`);
}

// ============ LIST ALL ============
/** Seluruh folder yang terlihat (untuk pemilih "Pindahkan ke" & aturan otomatisasi). */
export async function fetchAllFolders(): Promise<Folder[]> {
  return fetchFlat();
}
