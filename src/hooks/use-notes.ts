"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as notesApi from "@/lib/api/notes";

export const noteKeys = {
  forDocument: (documentId: string) => ["document-notes", documentId] as const,
};

/** Catatan satu dokumen. */
export function useNotes(documentId: string, enabled = true) {
  return useQuery({
    queryKey: noteKeys.forDocument(documentId),
    queryFn: () => notesApi.fetchNotes(documentId),
    enabled,
  });
}

function useInvalidateNotes(documentId: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: noteKeys.forDocument(documentId) });
    qc.invalidateQueries({ queryKey: ["document-history", documentId] });
  };
}

export function useAddNote(documentId: string) {
  const invalidate = useInvalidateNotes(documentId);
  return useMutation({
    mutationFn: (body: string) => notesApi.addNote(documentId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(documentId: string) {
  const invalidate = useInvalidateNotes(documentId);
  return useMutation({
    mutationFn: (noteId: string) => notesApi.deleteNote(noteId),
    onSuccess: invalidate,
  });
}
