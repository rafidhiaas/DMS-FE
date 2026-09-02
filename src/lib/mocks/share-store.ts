import type { AccessLevel, DocumentShare, SharedWithMeItem, UserSummary } from "@/types";
import { MOCK_ACCOUNTS } from "@/lib/mocks/auth";
import { getMockActor } from "@/lib/mocks/actor";
import { allMockUsers, recordActivity } from "@/lib/mocks/audit-store";
import { peekDocuments } from "@/lib/mocks/dms-store";

/**
 * MOCK store Berbagi Dokumen — persist di localStorage, meniru perilaku
 * backend Express (upsert saat share ulang, larangan share ke diri sendiri,
 * pencatatan audit log). Ganti dengan API asli (/api/shares) begitu backend siap.
 */

const STORAGE_KEY = "dms_mock_shares_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `share-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function nowIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function seed(): DocumentShare[] {
  // Setiap akun demo menerima minimal satu share agar halaman
  // "Dibagikan ke Saya" tidak kosong untuk peran mana pun.
  return [
    { id: "seed-share-1", document_id: "seed-doc-1", user_id: MOCK_ACCOUNTS.EMPLOYEE.id, access_level: "DOWNLOADER", created_at: nowIso(3) },
    { id: "seed-share-2", document_id: "seed-doc-3", user_id: MOCK_ACCOUNTS.EMPLOYEE.id, access_level: "VIEWER", created_at: nowIso(1) },
    { id: "seed-share-3", document_id: "seed-doc-1", user_id: MOCK_ACCOUNTS.COMPANY_ADMIN.id, access_level: "EDITOR", created_at: nowIso(2) },
    { id: "seed-share-4", document_id: "seed-doc-1", user_id: MOCK_ACCOUNTS.AUDITOR.id, access_level: "VIEWER", created_at: nowIso(2) },
    { id: "seed-share-5", document_id: "seed-doc-3", user_id: MOCK_ACCOUNTS.SUPER_ADMIN.id, access_level: "DOWNLOADER", created_at: nowIso(1) },
    { id: "seed-share-6", document_id: "seed-doc-3", user_id: "33333333-3333-3333-3333-333333333333", access_level: "VIEWER", created_at: nowIso(1) },
  ];
}

function load(): DocumentShare[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as DocumentShare[];
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function save(shares: DocumentShare[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shares));
}

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function resolveUser(userId: string): UserSummary | undefined {
  return allMockUsers().find((u) => u.id === userId);
}

export const mockShareStore = {
  /** Meniru GET /shares/shared-with-me untuk user yang sedang login. */
  async getSharedWithMe(): Promise<SharedWithMeItem[]> {
    const actor = getMockActor();
    const docs = peekDocuments();
    const items = load()
      .filter((s) => s.user_id === actor.id)
      .flatMap<SharedWithMeItem>((s) => {
        const doc = docs.find((d) => d.id === s.document_id);
        if (!doc) return []; // dokumen sudah dihapus — share ikut hilang (cascade)
        return [
          {
            ...s,
            document: {
              id: doc.id,
              title: doc.title,
              extension: doc.extension,
              status: doc.status,
              current_version: doc.current_version,
              updated_at: doc.updated_at,
            },
          },
        ];
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(items);
  },

  /** Meniru GET /shares/documents/:id/share — daftar penerima akses. */
  async getDocumentShares(documentId: string): Promise<DocumentShare[]> {
    const shares = load()
      .filter((s) => s.document_id === documentId)
      .map((s) => ({ ...s, user: resolveUser(s.user_id) }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return delay(shares);
  },

  /** Meniru POST /shares/documents/:id/share — upsert per (dokumen, user). */
  async shareDocument(
    documentId: string,
    input: { user_id: string; access_level: AccessLevel },
  ): Promise<DocumentShare> {
    const actor = getMockActor();
    if (input.user_id === actor.id) {
      throw new Error("Tidak dapat membagikan dokumen ke akun Anda sendiri.");
    }
    const target = resolveUser(input.user_id);
    if (!target) throw new Error("Pengguna tujuan tidak ditemukan.");

    const doc = peekDocuments().find((d) => d.id === documentId);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");

    const shares = load();
    const existing = shares.find(
      (s) => s.document_id === documentId && s.user_id === input.user_id,
    );

    let share: DocumentShare;
    if (existing) {
      existing.access_level = input.access_level;
      share = existing;
    } else {
      share = {
        id: uuid(),
        document_id: documentId,
        user_id: input.user_id,
        access_level: input.access_level,
        created_at: new Date().toISOString(),
      };
      shares.push(share);
    }
    save(shares);
    recordActivity(
      "SHARE_DOCUMENT",
      `Membagikan dokumen "${doc.title}" ke user ${target.email} dengan akses ${input.access_level}`,
    );
    return delay({ ...share, user: target });
  },

  /** Meniru PATCH /shares/:shareId — ubah level akses. */
  async updateShareAccess(shareId: string, access_level: AccessLevel): Promise<DocumentShare> {
    const shares = load();
    const share = shares.find((s) => s.id === shareId);
    if (!share) throw new Error("Data akses berbagi tidak ditemukan.");
    share.access_level = access_level;
    save(shares);
    recordActivity("UPDATE_SHARE_ACCESS", `Mengubah level akses share menjadi ${access_level}`);
    return delay({ ...share, user: resolveUser(share.user_id) });
  },

  /** Meniru DELETE /shares/:shareId — cabut akses. */
  async revokeShare(shareId: string): Promise<void> {
    const shares = load();
    const share = shares.find((s) => s.id === shareId);
    if (!share) throw new Error("Data akses berbagi tidak ditemukan.");
    const doc = peekDocuments().find((d) => d.id === share.document_id);
    save(shares.filter((s) => s.id !== shareId));
    recordActivity("REVOKE_SHARE", `Mencabut akses share untuk dokumen "${doc?.title ?? share.document_id}"`);
    return delay(undefined);
  },
};
