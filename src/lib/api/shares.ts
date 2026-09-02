import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockShareStore } from "@/lib/mocks/share-store";
import type { AccessLevel, DocumentShare, SharedWithMeItem } from "@/types";

/** Lapisan akses data Berbagi Dokumen (mock ↔ backend Express /api/shares). */

export async function fetchSharedWithMe(): Promise<SharedWithMeItem[]> {
  if (env.USE_MOCKS) return mockShareStore.getSharedWithMe();
  const { data } = await api.get<{ shares: SharedWithMeItem[] }>("/shares/shared-with-me");
  return data.shares;
}

export async function fetchDocumentShares(documentId: string): Promise<DocumentShare[]> {
  if (env.USE_MOCKS) return mockShareStore.getDocumentShares(documentId);
  const { data } = await api.get<{ shares: DocumentShare[] }>(
    `/shares/documents/${documentId}/share`,
  );
  return data.shares;
}

export async function shareDocument(
  documentId: string,
  input: { user_id: string; access_level: AccessLevel },
): Promise<DocumentShare> {
  if (env.USE_MOCKS) return mockShareStore.shareDocument(documentId, input);
  const { data } = await api.post<{ share: DocumentShare }>(
    `/shares/documents/${documentId}/share`,
    input,
  );
  return data.share;
}

export async function updateShareAccess(
  shareId: string,
  access_level: AccessLevel,
): Promise<DocumentShare> {
  if (env.USE_MOCKS) return mockShareStore.updateShareAccess(shareId, access_level);
  const { data } = await api.patch<{ share: DocumentShare }>(`/shares/${shareId}`, {
    access_level,
  });
  return data.share;
}

export async function revokeShare(shareId: string): Promise<void> {
  if (env.USE_MOCKS) return mockShareStore.revokeShare(shareId);
  await api.delete(`/shares/${shareId}`);
}
