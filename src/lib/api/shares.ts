import { api } from "@/lib/api/client";
import type { AccessLevel, DocumentShare, SharedWithMeItem } from "@/types";
import { mapShare, unwrap, type BeShare } from "@/lib/api/_transform";

/** Lapisan akses data Berbagi Dokumen → backend Express `/api/shares` (lewat BFF). */

type SharesPayload = { shares?: BeShare[] } | null;
type SharePayload = { share?: BeShare } | null;

// ============ SHARED WITH ME ============
export async function fetchSharedWithMe(): Promise<SharedWithMeItem[]> {
  const { data } = await api.get<unknown>("/shares/shared-with-me");
  const shares = unwrap<SharesPayload>(data)?.shares ?? [];
  return shares.map(mapShare) as SharedWithMeItem[];
}

// ============ DOCUMENT SHARES ============
export async function fetchDocumentShares(documentId: string): Promise<DocumentShare[]> {
  const { data } = await api.get<unknown>(`/shares/documents/${documentId}/share`);
  const shares = unwrap<SharesPayload>(data)?.shares ?? [];
  return shares.map(mapShare) as DocumentShare[];
}

// ============ SHARE ============
export async function shareDocument(
  documentId: string,
  input: { user_id: string; access_level: AccessLevel },
): Promise<DocumentShare> {
  const { data } = await api.post<unknown>(`/shares/documents/${documentId}/share`, {
    user_id: input.user_id, // BE memakai snake_case untuk body share
    access_level: input.access_level,
  });
  return mapShare(unwrap<SharePayload>(data)?.share) as DocumentShare;
}

// ============ UPDATE ACCESS ============
export async function updateShareAccess(
  shareId: string,
  access_level: AccessLevel,
): Promise<DocumentShare> {
  const { data } = await api.patch<unknown>(`/shares/${shareId}`, { access_level });
  return mapShare(unwrap<SharePayload>(data)?.share) as DocumentShare;
}

// ============ REVOKE ============
export async function revokeShare(shareId: string): Promise<void> {
  await api.delete(`/shares/${shareId}`);
}