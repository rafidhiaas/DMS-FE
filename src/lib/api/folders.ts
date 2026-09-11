import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockStore } from "@/lib/mocks/dms-store";
import type { Folder, FolderContents } from "@/types";

/**
 * Lapisan akses data Folder. Saat USE_MOCKS aktif → pakai localStorage store.
 * Saat backend siap → set NEXT_PUBLIC_USE_MOCKS=false, otomatis pakai Express via /api/bff.
 */

export async function fetchFolderContents(folderId: string): Promise<FolderContents> {
  if (env.USE_MOCKS) return mockStore.getContents(folderId);
  const { data } = await api.get<FolderContents>(`/folders/${folderId}`);
  return data;
}

export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  if (env.USE_MOCKS) return mockStore.getFolderPath(folderId);
  // Backend belum punya endpoint path/breadcrumb — bangun dari data yang ada nanti.
  // Untuk sementara kembalikan array kosong pada mode non-mock.
  return [];
}

export async function createFolder(input: {
  name: string;
  parent_folder_id: string | null;
}): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.createFolder(input);
  const { data } = await api.post<{ folder: Folder }>("/folders", input);
  return data.folder;
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.renameFolder(id, name);
  const { data } = await api.patch<{ folder: Folder }>(`/folders/${id}/rename`, {
    name,
  });
  return data.folder;
}

export async function deleteFolder(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockStore.deleteFolder(id);
  await api.delete(`/folders/${id}`);
}

/** Meniru PATCH /folders/:id/move (body: new_parent_folder_id, null = Root). */
export async function moveFolder(id: string, newParentId: string | null): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.moveFolder(id, newParentId);
  const { data } = await api.patch<{ folder: Folder }>(`/folders/${id}/move`, {
    new_parent_folder_id: newParentId,
  });
  return data.folder;
}

/**
 * Seluruh folder (untuk pemilih "Pindahkan ke"). Backend belum punya endpoint
 * list semua folder, jadi di mode backend kita telusuri dari root (BFS, maks 300).
 */
export async function fetchAllFolders(): Promise<Folder[]> {
  if (env.USE_MOCKS) return mockStore.listFolders();
  const out: Folder[] = [];
  const queue: string[] = ["root"];
  while (queue.length > 0 && out.length < 300) {
    const id = queue.shift()!;
    const { data } = await api.get<FolderContents>(`/folders/${id}`);
    for (const f of data.subFolders) {
      out.push(f);
      queue.push(f.id);
    }
  }
  return out;
}
