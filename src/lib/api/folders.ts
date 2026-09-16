import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockStore } from "@/lib/mocks/dms-store";
import type { Folder, FolderContents } from "@/types";
import { mapFolder, mapDocument, unwrap } from "@/lib/api/_transform";

/** Fetch tree folder lengkap dari BE. */
async function fetchTree(): Promise<any[]> {
  const { data } = await api.get<any>("/folders");
  return (unwrap<any[]>(data) ?? []) as any[];
}

function findFolder(nodes: any[], id: string): any {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.subFolders) {
      const found = findFolder(n.subFolders, id);
      if (found) return found;
    }
  }
  return null;
}

// ============ READ ============
export async function fetchFolderContents(folderId: string): Promise<FolderContents> {
  if (env.USE_MOCKS) return mockStore.getContents(folderId);

  // Docs di folder ini (BE support filter folderId)
  const docsRes = await api.get<any>("/documents", {
    params: { folderId: folderId === "root" ? undefined : folderId, limit: 500 },
  });
  const docsPayload = unwrap<any>(docsRes.data);
  const documents = (docsPayload?.documents ?? [])
    .map(mapDocument)
    .filter(Boolean) as any[];

  // Tree untuk subfolders
  const tree = await fetchTree();

  if (folderId === "root") {
    return {
      folderId: null,
      subFolders: tree.map(mapFolder).filter(Boolean) as Folder[],
      documents: [],
    };
  }

  const found = findFolder(tree, folderId);
  return {
    folderId,
    subFolders: (found?.subFolders ?? [])
      .map(mapFolder)
      .filter(Boolean) as Folder[],
    documents,
  };
}

export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  if (env.USE_MOCKS) return mockStore.getFolderPath(folderId);
  return [];
}

// ============ CREATE ============
export async function createFolder(input: {
  name: string;
  parent_folder_id: string | null;
  description?: string;
}): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.createFolder(input);
  const { data } = await api.post<any>("/folders", {
    name: input.name,
    description: input.description,
    parentFolderId: input.parent_folder_id,
  });
  return mapFolder(unwrap<any>(data)) as Folder;
}

// ============ UPDATE ============
export async function renameFolder(id: string, name: string): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.renameFolder(id, name);
  const { data } = await api.patch<any>(`/folders/${id}/rename`, { name });
  return mapFolder(unwrap<any>(data)) as Folder;
}

export async function moveFolder(id: string, newParentId: string | null): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.moveFolder(id, newParentId);
  const { data } = await api.patch<any>(`/folders/${id}/move`, {
    parentFolderId: newParentId,
  });
  return mapFolder(unwrap<any>(data)) as Folder;
}

// ============ DELETE ============
export async function deleteFolder(id: string): Promise<void> {
  if (env.USE_MOCKS) return mockStore.deleteFolder(id);
  await api.delete(`/folders/${id}`);
}

// ============ LIST ALL ============
export async function fetchAllFolders(): Promise<Folder[]> {
  if (env.USE_MOCKS) return mockStore.listFolders();
  const tree = await fetchTree();
  const out: Folder[] = [];
  const walk = (nodes: any[]) => {
    for (const n of nodes) {
      out.push(mapFolder(n) as Folder);
      if (n.subFolders) walk(n.subFolders);
    }
  };
  walk(tree);
  return out;
}