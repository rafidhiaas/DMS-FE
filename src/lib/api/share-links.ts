import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockShareLinkStore } from "@/lib/mocks/share-link-store";
import type { PublicShareView, ShareLink, ShareLinkAccess } from "@/types";

/**
 * Lapisan akses data Tautan Publik (ShareLink).
 * Backend Express BELUM punya endpoint ini (lihat backend-gaps). Path di bawah
 * mengikuti pola /api/shares yang ada, agar tinggal disambungkan nanti.
 */

const NOT_READY = "Tautan publik menunggu endpoint ShareLink di backend.";

export async function fetchShareLinks(documentId: string): Promise<ShareLink[]> {
  if (env.USE_MOCKS) return mockShareLinkStore.listForDocument(documentId);
  const { data } = await api.get<{ links: ShareLink[] }>(
    `/shares/documents/${documentId}/links`,
  );
  return data.links;
}

export async function createShareLink(
  documentId: string,
  input: { access: ShareLinkAccess; expires_in_days: number | null },
): Promise<ShareLink> {
  if (env.USE_MOCKS) return mockShareLinkStore.create(documentId, input);
  const { data } = await api.post<{ link: ShareLink }>(
    `/shares/documents/${documentId}/links`,
    input,
  );
  return data.link;
}

export async function revokeShareLink(linkId: string): Promise<void> {
  if (env.USE_MOCKS) return mockShareLinkStore.revoke(linkId);
  await api.delete(`/shares/links/${linkId}`);
}

/** Dipakai halaman publik — tanpa sesi login. */
export async function resolveShareLink(token: string): Promise<PublicShareView> {
  if (env.USE_MOCKS) return mockShareLinkStore.resolve(token);
  // Endpoint publik nantinya tidak lewat BFF ber-token; sementara tolak dengan pesan jelas.
  throw new Error(NOT_READY);
}

/** URL absolut tautan publik untuk disalin ke clipboard. */
export function shareLinkUrl(token: string): string {
  if (typeof window === "undefined") return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}
