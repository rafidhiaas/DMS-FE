import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockShareStore } from "@/lib/mocks/share-store";
import type { AccessLevel, DocumentShare, SharedWithMeItem } from "@/types";
import { mapShare, unwrap } from "@/lib/api/_transform";

// ============ SHARED WITH ME ============
export async function fetchSharedWithMe(): Promise<SharedWithMeItem[]> {
  if (env.USE_MOCKS) return mockShareStore.getSharedWithMe();
  const { data } = await api.get<any>("/shares/shared-with-me");
  const payload = unwrap<any>(data);
  const shares = payload?.shares ?? [];
  return shares.map(mapShare) as SharedWithMeItem[];
}

// ============ DOCUMENT SHARES ============
export async function fetchDocumentShares(documentId: string): Promise<DocumentShare[]> {
  if (env.USE_MOCKS) return mockShareStore.getDocumentShares(documentId);
  const { data } = await api.get<any>(`/shares/documents/${documentId}/share`);
  const payload = unwrap<any>(data);
  const shares = payload?.shares ?? [];
  return shares.map(mapShare) as DocumentShare[];
}

// ============ SHARE ============
export async function shareDocument(
  documentId: string,
  input: { user_id: string; access_level: AccessLevel },
): Promise<DocumentShare> {
  if (env.USE_MOCKS) return mockShareStore.shareDocument(documentId, input);
  const { data } = await api.post<any>(`/shares/documents/${documentId}/share`, {
    user_id: input.user_id,        // BE juga pakai user_id (snake) untuk body
    access_level: input.access_level,
  });
  const payload = unwrap<any>(data);
  return mapShare(payload?.share) as DocumentShare;
}

// ============ UPDATE ACCESS ============
export async function updateShareAccess(
  shareId: string,
  access_level: AccessLevel,
): Promise<DocumentShare> {
  if (env.USE_MOCKS) return mockShareStore.updateShareAccess(shareId, access_level);
  const { data } = await api.patch<any>(`/shares/${shareId}`, { access_level });
  const payload = unwrap<any>(data);
  return mapShare(payload?.share) as DocumentShare;
}

// ============ REVOKE ============
export async function revokeShare(shareId: string): Promise<void> {
  if (env.USE_MOCKS) return mockShareStore.revokeShare(shareId);
  await api.delete(`/shares/${shareId}`);
}