"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as sharesApi from "@/lib/api/shares";
import type { AccessLevel } from "@/types";

export const shareKeys = {
  sharedWithMe: ["shared-with-me"] as const,
  documentShares: (documentId: string) => ["document-shares", documentId] as const,
};

export function useSharedWithMe() {
  return useQuery({
    queryKey: shareKeys.sharedWithMe,
    queryFn: sharesApi.fetchSharedWithMe,
  });
}

export function useDocumentShares(documentId: string, enabled = true) {
  return useQuery({
    queryKey: shareKeys.documentShares(documentId),
    queryFn: () => sharesApi.fetchDocumentShares(documentId),
    enabled,
  });
}

function useInvalidateShares(documentId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: shareKeys.documentShares(documentId) });
    qc.invalidateQueries({ queryKey: shareKeys.sharedWithMe });
  };
}

export function useShareDocument(documentId: string) {
  const invalidate = useInvalidateShares(documentId);
  return useMutation({
    mutationFn: (input: { user_id: string; access_level: AccessLevel }) =>
      sharesApi.shareDocument(documentId, input),
    onSuccess: invalidate,
  });
}

export function useUpdateShareAccess(documentId: string) {
  const invalidate = useInvalidateShares(documentId);
  return useMutation({
    mutationFn: ({ shareId, access_level }: { shareId: string; access_level: AccessLevel }) =>
      sharesApi.updateShareAccess(shareId, access_level),
    onSuccess: invalidate,
  });
}

export function useRevokeShare(documentId: string) {
  const invalidate = useInvalidateShares(documentId);
  return useMutation({
    mutationFn: (shareId: string) => sharesApi.revokeShare(shareId),
    onSuccess: invalidate,
  });
}
