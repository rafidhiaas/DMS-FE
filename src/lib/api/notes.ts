import { api } from "@/lib/api/client";
import type { DocumentNote } from "@/types";
import { mapUserSummary, unwrap, type BeUser } from "@/lib/api/_transform";

/** Catatan dokumen → backend `GET/POST /documents/:id/notes`, `DELETE /documents/notes/:noteId`. */

interface BeNote {
  id: string;
  documentId: string;
  userId: string;
  body: string;
  createdAt: string;
  user?: BeUser | null;
}

function mapNote(n: BeNote): DocumentNote {
  return {
    id: n.id,
    document_id: n.documentId,
    user_id: n.userId,
    body: n.body,
    created_at: n.createdAt,
    user: mapUserSummary(n.user),
  };
}

export async function fetchNotes(documentId: string): Promise<DocumentNote[]> {
  const { data } = await api.get<unknown>(`/documents/${documentId}/notes`);
  return (unwrap<BeNote[]>(data) ?? []).map(mapNote);
}

export async function addNote(documentId: string, body: string): Promise<DocumentNote> {
  const { data } = await api.post<unknown>(`/documents/${documentId}/notes`, { body });
  return mapNote(unwrap<BeNote>(data));
}

export async function deleteNote(noteId: string): Promise<void> {
  await api.delete(`/documents/notes/${noteId}`);
}