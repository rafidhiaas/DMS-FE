import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockStore } from "@/lib/mocks/dms-store";
import type { DocumentItem, Folder, FolderContents } from "@/types";
import {
  mapFolder,
  mapDocument,
  unwrap,
  type BeDocument,
  type BeFolder,
} from "@/lib/api/_transform";

/** Fetch tree folder lengkap dari BE. */
async function fetchTree(): Promise<BeFolder[]> {
  const { data } = await api.get<unknown>("/folders");
  return unwrap<BeFolder[]>(data) ?? [];
}

/** Jalur dari root ke folder `id` (termasuk folder itu sendiri); null bila tidak ada. */
function findPath(nodes: BeFolder[], id: string): BeFolder[] | null {
  for (const n of nodes) {
    if (n.id === id) return [n];
    const rest = n.subFolders ? findPath(n.subFolders, id) : null;
    if (rest) return [n, ...rest];
  }
  return null;
}

function findFolder(nodes: BeFolder[], id: string): BeFolder | null {
  return findPath(nodes, id)?.at(-1) ?? null;
}

// ============ READ ============
export async function fetchFolderContents(folderId: string): Promise<FolderContents> {
  if (env.USE_MOCKS) return mockStore.getContents(folderId);

  // Tree untuk subfolders
  const tree = await fetchTree();

  if (folderId === "root") {
    return {
      folderId: null,
      subFolders: tree.map(mapFolder) as Folder[],
      documents: [],
    };
  }

  // Docs di folder ini (BE support filter folderId)
  const docsRes = await api.get<unknown>("/documents", {
    params: { folderId, limit: 500 },
  });
  const docsPayload = unwrap<{ documents?: BeDocument[] } | null>(docsRes.data);
  const documents = (docsPayload?.documents ?? []).map(mapDocument) as DocumentItem[];

  const found = findFolder(tree, folderId);
  return {
    folderId,
    subFolders: (found?.subFolders ?? []).map(mapFolder) as Folder[],
    documents,
  };
}

export async function fetchFolderPath(folderId: string): Promise<Folder[]> {
  if (env.USE_MOCKS) return mockStore.getFolderPath(folderId);
  if (folderId === "root") return [];
  const path = findPath(await fetchTree(), folderId);
  return (path ?? []).map(mapFolder) as Folder[];
}

// ============ CREATE ============
export async function createFolder(input: {
  name: string;
  parent_folder_id: string | null;
  description?: string;
}): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.createFolder(input);
  const { data } = await api.post<unknown>("/folders", {
    name: input.name,
    description: input.description,
    parentFolderId: input.parent_folder_id,
  });
  return mapFolder(unwrap<BeFolder>(data)) as Folder;
}

// ============ UPDATE ============
export async function renameFolder(id: string, name: string): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.renameFolder(id, name);
  const { data } = await api.patch<unknown>(`/folders/${id}/rename`, { name });
  return mapFolder(unwrap<BeFolder>(data)) as Folder;
}

export async function moveFolder(id: string, newParentId: string | null): Promise<Folder> {
  if (env.USE_MOCKS) return mockStore.moveFolder(id, newParentId);
  const { data } = await api.patch<unknown>(`/folders/${id}/move`, {
    parentFolderId: newParentId,
  });
  return mapFolder(unwrap<BeFolder>(data)) as Folder;
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
  const walk = (nodes: BeFolder[]) => {
    for (const n of nodes) {
      out.push(mapFolder(n) as Folder);
      if (n.subFolders) walk(n.subFolders);
    }
  };
  walk(tree);
  return out;
}
