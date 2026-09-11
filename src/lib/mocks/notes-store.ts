import type { DocumentNote, UserSummary } from "@/types";
import { getMockActor } from "@/lib/mocks/actor";
import { allMockUsers, recordActivity } from "@/lib/mocks/audit-store";
import { peekDocuments } from "@/lib/mocks/dms-store";

/**
 * MOCK store Catatan Dokumen — meniru tab "Notes" Paperless-ngx.
 * Backend belum punya entitas Note; persist di localStorage sampai endpoint tersedia.
 */

const STORAGE_KEY = "dms_mock_notes_v1";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function load(): DocumentNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DocumentNote[]) : [];
  } catch {
    return [];
  }
}

function save(notes: DocumentNote[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function resolveUser(userId: string): UserSummary | undefined {
  return allMockUsers().find((u) => u.id === userId);
}

export const mockNotesStore = {
  async list(documentId: string): Promise<DocumentNote[]> {
    const notes = load()
      .filter((n) => n.document_id === documentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((n) => ({ ...n, user: resolveUser(n.user_id) }));
    return delay(notes);
  },

  async add(documentId: string, body: string): Promise<DocumentNote> {
    const text = body.trim();
    if (!text) throw new Error("Catatan tidak boleh kosong.");
    const doc = peekDocuments().find((d) => d.id === documentId);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    const actor = getMockActor();
    const note: DocumentNote = {
      id: uuid(),
      document_id: documentId,
      user_id: actor.id,
      body: text,
      created_at: new Date().toISOString(),
    };
    const notes = load();
    notes.push(note);
    save(notes);
    recordActivity("ADD_NOTE", `Menambah catatan pada dokumen "${doc.title}"`, {
      document_id: documentId,
    });
    return delay({ ...note, user: resolveUser(actor.id) });
  },

  async remove(noteId: string): Promise<void> {
    const notes = load();
    const note = notes.find((n) => n.id === noteId);
    if (!note) throw new Error("Catatan tidak ditemukan.");
    const actor = getMockActor();
    const isAdmin = actor.role === "SUPER_ADMIN" || actor.role === "COMPANY_ADMIN";
    if (note.user_id !== actor.id && !isAdmin) {
      throw new Error("Hanya penulis catatan atau admin yang dapat menghapusnya.");
    }
    const doc = peekDocuments().find((d) => d.id === note.document_id);
    save(notes.filter((n) => n.id !== noteId));
    recordActivity("DELETE_NOTE", `Menghapus catatan pada dokumen "${doc?.title ?? note.document_id}"`, {
      document_id: note.document_id,
    });
    return delay(undefined);
  },
};
