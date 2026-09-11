"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as documentsApi from "@/lib/api/documents";
import type { BulkMetaPatch, DocumentMetaPatch } from "@/types";

export const documentKeys = {
  detail: (id: string) => ["document", id] as const,
  trash: ["trash"] as const,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: documentKeys.trash });
    },
  });
}

/* -------------------------------- Sampah -------------------------------- */

/** Isi Sampah; `null` berarti backend belum mendukung soft delete. */
export function useTrash() {
  return useQuery({
    queryKey: documentKeys.trash,
    queryFn: documentsApi.fetchTrash,
  });
}

function useInvalidateTrash() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: documentKeys.trash });
    qc.invalidateQueries({ queryKey: ["folder-contents"] });
    qc.invalidateQueries({ queryKey: ["dms-stats"] });
  };
}

export function useRestoreDocument() {
  const invalidate = useInvalidateTrash();
  return useMutation({
    mutationFn: (id: string) => documentsApi.restoreDocument(id),
    onSuccess: invalidate,
  });
}

export function usePurgeDocument() {
  const invalidate = useInvalidateTrash();
  return useMutation({
    mutationFn: (id: string) => documentsApi.purgeDocument(id),
    onSuccess: invalidate,
  });
}

export function useEmptyTrash() {
  const invalidate = useInvalidateTrash();
  return useMutation({
    mutationFn: () => documentsApi.emptyTrash(),
    onSuccess: invalidate,
  });
}

/* -------------------------------- Pindah -------------------------------- */

export function useMoveDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, folder_id }: { id: string; folder_id: string }) =>
      documentsApi.moveDocument(id, folder_id),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["document-history", id] });
    },
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
      file?: File;
    }) => documentsApi.uploadNewVersion(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: ["document-history", id] });
    },
  });
}

/* ------------------------------- Metadata ------------------------------- */

export function useUpdateDocumentMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: DocumentMetaPatch }) =>
      documentsApi.updateDocumentMeta(id, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: documentKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: ["all-documents"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["document-history", id] });
    },
  });
}

export function useBulkUpdateMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: BulkMetaPatch }) =>
      documentsApi.bulkUpdateMeta(ids, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folder-contents"] });
      qc.invalidateQueries({ queryKey: ["all-documents"] });
      qc.invalidateQueries({ queryKey: ["document"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
    },
  });
}
