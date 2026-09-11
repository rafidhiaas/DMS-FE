"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as metaApi from "@/lib/api/meta";
import type { MetaKind } from "@/types";

export const metaKeys = {
  list: (kind: MetaKind) => ["meta", kind] as const,
};

/** Daftar Tag / Tipe Dokumen / Pihak (dengan jumlah pemakaian). */
export function useMeta(kind: MetaKind, enabled = true) {
  return useQuery({
    queryKey: metaKeys.list(kind),
    queryFn: () => metaApi.fetchMeta(kind),
    enabled,
    staleTime: 30_000,
  });
}

export const useTags = (enabled = true) => useMeta("tag", enabled);
export const useDocumentTypes = (enabled = true) => useMeta("type", enabled);
export const useCorrespondents = (enabled = true) => useMeta("correspondent", enabled);

function useInvalidateMeta(kind: MetaKind) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: metaKeys.list(kind) });
    // Perubahan/hapus item memengaruhi chip di daftar & detail dokumen.
    qc.invalidateQueries({ queryKey: ["folder-contents"] });
    qc.invalidateQueries({ queryKey: ["document"] });
    qc.invalidateQueries({ queryKey: ["all-documents"] });
  };
}

export function useCreateMeta(kind: MetaKind) {
  const invalidate = useInvalidateMeta(kind);
  return useMutation({
    mutationFn: (input: { name: string; color?: string }) => metaApi.createMeta(kind, input),
    onSuccess: invalidate,
  });
}

export function useUpdateMeta(kind: MetaKind) {
  const invalidate = useInvalidateMeta(kind);
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string; name?: string; color?: string }) =>
      metaApi.updateMeta(kind, id, patch),
    onSuccess: invalidate,
  });
}

export function useDeleteMeta(kind: MetaKind) {
  const invalidate = useInvalidateMeta(kind);
  return useMutation({
    mutationFn: (id: string) => metaApi.deleteMeta(kind, id),
    onSuccess: invalidate,
  });
}
