import { env } from "@/lib/env";
import { api } from "@/lib/api/client";
import { mockNotesStore } from "@/lib/mocks/notes-store";
import type { DocumentNote } from "@/types";

/**
 * Lapisan akses data Catatan Dokumen.
 * Backend belum punya endpoint-nya; path di bawah adalah usulan bentuk
 * (`GET/POST /documents/:id/notes`, `DELETE /documents/notes/:noteId`).
 * Mode backend mengembalikan `null` agar UI menampilkan teks fallback.
 */

export async function fetchNotes(documentId: string): Promise<DocumentNote[] | null> {
  if (env.USE_MOCKS) return mockNotesStore.list(documentId);
  return null;
}

export async function addNote(documentId: string, body: string): Promise<DocumentNote> {
  if (env.USE_MOCKS) return mockNotesStore.add(documentId, body);
  const { data } = await api.post<{ note: DocumentNote }>(`/documents/${documentId}/notes`, { body });
  return data.note;
}

export async function deleteNote(noteId: string): Promise<void> {
  if (env.USE_MOCKS) return mockNotesStore.remove(noteId);
  await api.delete(`/documents/notes/${noteId}`);
}
