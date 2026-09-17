import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockShareStore } from "@/lib/mocks/share-store";
import type { AccessLevel, DocumentShare, SharedWithMeItem } from "@/types";
import { mapShare, unwrap, type BeShare } from "@/lib/api/_transform";

type SharesPayload = { shares?: BeShare[] } | null;
type SharePayload = { share?: BeShare } | null;

// ============ SHARED WITH ME ============
export async function fetchSharedWithMe(): Promise<SharedWithMeItem[]> {
  if (env.USE_MOCKS) return mockShareStore.getSharedWithMe();
  const { data } = await api.get<unknown>("/shares/shared-with-me");
  const shares = unwrap<SharesPayload>(data)?.shares ?? [];
  return shares.map(mapShare) as SharedWithMeItem[];
}

// ============ DOCUMENT SHARES ============
export async function fetchDocumentShares(documentId: string): Promise<DocumentShare[]> {
  if (env.USE_MOCKS) return mockShareStore.getDocumentShares(documentId);
  const { data } = await api.get<unknown>(`/shares/documents/${documentId}/share`);
  const shares = unwrap<SharesPayload>(data)?.shares ?? [];
  return shares.map(mapShare) as DocumentShare[];
}

// ============ SHARE ============
export async function shareDocument(
  documentId: string,
  input: { user_id: string; access_level: AccessLevel },
): Promise<DocumentShare> {
  if (env.USE_MOCKS) return mockShareStore.shareDocument(documentId, input);
  const { data } = await api.post<unknown>(`/shares/documents/${documentId}/share`, {
    user_id: input.user_id, // BE juga pakai user_id (snake) untuk body
    access_level: input.access_level,
  });
  return mapShare(unwrap<SharePayload>(data)?.share) as DocumentShare;
}

// ============ UPDATE ACCESS ============
export async function updateShareAccess(
  shareId: string,
  access_level: AccessLevel,
): Promise<DocumentShare> {
  if (env.USE_MOCKS) return mockShareStore.updateShareAccess(shareId, access_level);
  const { data } = await api.patch<unknown>(`/shares/${shareId}`, { access_level });
  return mapShare(unwrap<SharePayload>(data)?.share) as DocumentShare;
}

// ============ REVOKE ============
export async function revokeShare(shareId: string): Promise<void> {
  if (env.USE_MOCKS) return mockShareStore.revokeShare(shareId);
  await api.delete(`/shares/${shareId}`);
}
