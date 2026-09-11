"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as documentsApi from "@/lib/api/documents";

export const documentKeys = {
  detail: (id: string) => ["document", id] as const,
};

export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => documentsApi.fetchDocument(id),
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: documentsApi.createDocument,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["folder-contents"] }),
  });
}

export function useRenameDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      documentsApi.renameDocument(id, title),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["document-history", id] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["folder-contents"] }),
  });
}

export function useUploadVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      size_bytes: number;
      changelog?: string;
      extension?: string;
    }) => documentsApi.uploadNewVersion(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: ["document-history", id] });
    },
  });
}
