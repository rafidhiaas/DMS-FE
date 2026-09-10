import type { PublicShareView, ShareLink, ShareLinkAccess } from "@/types";
import { getMockActor } from "@/lib/mocks/actor";
import { recordActivity } from "@/lib/mocks/audit-store";
import { peekDocuments, peekFolders } from "@/lib/mocks/dms-store";

/**
 * MOCK store Tautan Publik (ShareLink) — persist di localStorage.
 * Meniru spec backend: token acak, expiry opsional, akses VIEWER/DOWNLOADER,
 * dan pencatatan audit. Ganti dengan API asli begitu endpoint ShareLink ada.
 *
 * Catatan: karena data hidup di localStorage, halaman publik /share/[token]
 * hanya bisa dibuka di browser yang sama (cukup untuk demo alur UI).
 */

const STORAGE_KEY = "dms_mock_share_links_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `link-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Token URL-safe 24 karakter, mirip slug acak Paperless-ngx. */
function makeToken(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function load(): ShareLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ShareLink[]) : [];
  } catch {
    return [];
  }
}

function save(links: ShareLink[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function isExpired(link: ShareLink): boolean {
  return link.expires_at !== null && new Date(link.expires_at).getTime() <= Date.now();
}

export const mockShareLinkStore = {
  /** Daftar tautan aktif & kedaluwarsa milik satu dokumen (terbaru dulu). */
  async listForDocument(documentId: string): Promise<ShareLink[]> {
    const links = load()
      .filter((l) => l.document_id === documentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(links);
  },

  async create(
    documentId: string,
    input: { access: ShareLinkAccess; expires_in_days: number | null },
  ): Promise<ShareLink> {
    const doc = peekDocuments().find((d) => d.id === documentId);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");

    const expires_at =
      input.expires_in_days === null
        ? null
        : new Date(Date.now() + input.expires_in_days * 86_400_000).toISOString();

    const link: ShareLink = {
      id: uuid(),
      document_id: documentId,
      token: makeToken(),
      access: input.access,
      expires_at,
      created_by: getMockActor().id,
      created_at: new Date().toISOString(),
      access_count: 0,
    };
    const links = load();
    links.push(link);
    save(links);
    recordActivity(
      "CREATE_SHARE_LINK",
      `Membuat tautan publik (${link.access}, ${expires_at ? `berlaku ${input.expires_in_days} hari` : "tanpa batas"}) untuk dokumen "${doc.title}"`,
    );
    return delay(link);
  },

  async revoke(linkId: string): Promise<void> {
    const links = load();
    const link = links.find((l) => l.id === linkId);
    if (!link) throw new Error("Tautan tidak ditemukan.");
    const doc = peekDocuments().find((d) => d.id === link.document_id);
    save(links.filter((l) => l.id !== linkId));
    recordActivity(
      "REVOKE_SHARE_LINK",
      `Mencabut tautan publik untuk dokumen "${doc?.title ?? link.document_id}"`,
    );
    return delay(undefined);
  },

  /**
   * Resolusi token dari halaman publik. Melempar error dengan pesan yang
   * aman ditampilkan ke pengunjung (tanpa membedakan "tidak ada" vs "dicabut").
   */
  async resolve(token: string): Promise<PublicShareView> {
    const links = load();
    const link = links.find((l) => l.token === token);
    if (!link) throw new Error("Tautan tidak valid atau sudah dicabut.");
    if (isExpired(link)) throw new Error("Tautan sudah kedaluwarsa.");

    const doc = peekDocuments().find((d) => d.id === link.document_id);
    if (!doc) throw new Error("Dokumen sudah tidak tersedia.");
    const folder = peekFolders().find((f) => f.id === doc.folder_id);

    link.access_count += 1;
    save(links);
    recordActivity("ACCESS_SHARE_LINK", `Dokumen "${doc.title}" dibuka via tautan publik`);

    return delay({
      link,
      document: {
        id: doc.id,
        title: doc.title,
        extension: doc.extension,
        status: doc.status,
        current_version: doc.current_version,
        updated_at: doc.updated_at,
        size_bytes: doc.size_bytes,
        folder_name: folder?.name ?? "-",
      },
    });
  },
};
