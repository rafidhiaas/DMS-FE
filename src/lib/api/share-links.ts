import { api } from "@/lib/api/client";
import type { DocumentStatus, PublicShareView, ShareLink, ShareLinkAccess } from "@/types";
import { unwrap } from "@/lib/api/_transform";

/**
 * Tautan publik (ShareLink) → backend `/api/shares/.../links` + `/api/public/share/:token`.
 * Endpoint publik tetap lewat BFF: tanpa cookie sesi, BFF meneruskan tanpa Authorization.
 */

interface BeShareLink {
  id: string;
  documentId: string;
  token: string;
  access: ShareLinkAccess;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  accessCount: number;
}

function mapLink(l: BeShareLink): ShareLink {
  return {
    id: l.id,
    document_id: l.documentId,
    token: l.token,
    access: l.access,
    expires_at: l.expiresAt ?? null,
    created_by: l.createdBy,
    created_at: l.createdAt,
    access_count: l.accessCount ?? 0,
  };
}

export async function fetchShareLinks(documentId: string): Promise<ShareLink[]> {
  const { data } = await api.get<unknown>(`/shares/documents/${documentId}/links`);
  return (unwrap<BeShareLink[]>(data) ?? []).map(mapLink);
}

export async function createShareLink(
  documentId: string,
  input: { access: ShareLinkAccess; expires_in_days: number | null },
): Promise<ShareLink> {
  const { data } = await api.post<unknown>(`/shares/documents/${documentId}/links`, input);
  return mapLink(unwrap<BeShareLink>(data));
}

export async function revokeShareLink(linkId: string): Promise<void> {
  await api.delete(`/shares/links/${linkId}`);
}

/** Dipakai halaman publik — tanpa sesi login. */
export async function resolveShareLink(token: string): Promise<PublicShareView> {
  const { data } = await api.get<unknown>(`/public/share/${encodeURIComponent(token)}`);
  const payload = unwrap<{
    link: BeShareLink;
    document: {
      id: string;
      title: string;
      extension: string;
      status: DocumentStatus;
      currentVersion: number;
      updatedAt: string;
      sizeBytes: string | number;
      folderName: string;
    };
  }>(data);
  return {
    link: mapLink(payload.link),
    document: {
      id: payload.document.id,
      title: payload.document.title,
      extension: payload.document.extension,
      status: payload.document.status,
      current_version: payload.document.currentVersion,
      updated_at: payload.document.updatedAt,
      size_bytes: String(payload.document.sizeBytes ?? "0"),
      folder_name: payload.document.folderName,
    },
  };
}

/** URL absolut tautan publik untuk disalin ke clipboard. */
export function shareLinkUrl(token: string): string {
  if (typeof window === "undefined") return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}