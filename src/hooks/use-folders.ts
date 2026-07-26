"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as foldersApi from "@/lib/api/folders";

export const folderKeys = {
  contents: (folderId: string) => ["folder-contents", folderId] as const,
  path: (folderId: string) => ["folder-path", folderId] as const,
};

export function useFolderContents(folderId: string) {
  return useQuery({
    queryKey: folderKeys.contents(folderId),
    queryFn: () => foldersApi.fetchFolderContents(folderId),
  });
}

export function useFolderPath(folderId: string) {
  return useQuery({
    queryKey: folderKeys.path(folderId),
    queryFn: () => foldersApi.fetchFolderPath(folderId),
    enabled: folderId !== "root",
  });
}

function useInvalidateFolders() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["folder-contents"] });
    qc.invalidateQueries({ queryKey: ["folder-path"] });
  };
}

export function useCreateFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: foldersApi.createFolder,
    onSuccess: invalidate,
  });
}

export function useRenameFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      foldersApi.renameFolder(id, name),
    onSuccess: invalidate,
  });
}

export function useDeleteFolder() {
  const invalidate = useInvalidateFolders();
  return useMutation({
    mutationFn: (id: string) => foldersApi.deleteFolder(id),
    onSuccess: invalidate,
  });
}
