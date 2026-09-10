"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as shareLinksApi from "@/lib/api/share-links";
import type { ShareLinkAccess } from "@/types";

export const shareLinkKeys = {
  forDocument: (documentId: string) => ["share-links", documentId] as const,
  public: (token: string) => ["public-share", token] as const,
};

export function useShareLinks(documentId: string, enabled = true) {
  return useQuery({
    queryKey: shareLinkKeys.forDocument(documentId),
    queryFn: () => shareLinksApi.fetchShareLinks(documentId),
    enabled,
  });
}

export function useCreateShareLink(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { access: ShareLinkAccess; expires_in_days: number | null }) =>
      shareLinksApi.createShareLink(documentId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareLinkKeys.forDocument(documentId) }),
  });
}

export function useRevokeShareLink(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => shareLinksApi.revokeShareLink(linkId),
    onSuccess: () => qc.invalidateQueries({ queryKey: shareLinkKeys.forDocument(documentId) }),
  });
}

/** Halaman publik: resolusi token sekali (tanpa retry agar pesan error langsung tampil). */
export function usePublicShare(token: string) {
  return useQuery({
    queryKey: shareLinkKeys.public(token),
    queryFn: () => shareLinksApi.resolveShareLink(token),
    retry: false,
    staleTime: Infinity,
  });
}
