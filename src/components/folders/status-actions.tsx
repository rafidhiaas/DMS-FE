"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Archive, ArchiveRestore, Send, Undo2 } from "lucide-react";
import { useSetDocumentStatus } from "@/hooks/use-documents";
import { workflowActions, type WorkflowAction } from "@/lib/workflow";
import type { DocumentStatus, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SUBMIT_REVIEW: Send,
  APPROVE_DOCUMENT: CheckCircle2,
  REJECT_DOCUMENT: XCircle,
  WITHDRAW_REVIEW: Undo2,
  ARCHIVE_DOCUMENT: Archive,
  UNARCHIVE_DOCUMENT: ArchiveRestore,
};

/** Tombol alur status dokumen (ajukan review / setujui / tolak / arsipkan) sesuai peran. */
export function StatusActions({
  documentId,
  status,
  role,
  size = "default",
}: {
  documentId: string;
  status: DocumentStatus;
  role: Role;
  size?: "default" | "sm";
}) {
  const setStatus = useSetDocumentStatus();
  const [noteFor, setNoteFor] = useState<WorkflowAction | null>(null);
  const [note, setNote] = useState("");
  const actions = workflowActions(status, role);
  if (actions.length === 0) return null;

  function run(action: WorkflowAction, reason?: string) {
    setStatus.mutate(
      { id: documentId, status: action.to, note: reason },
      {
        onSuccess: () => {
          toast.success(action.toast);
          setNoteFor(null);
          setNote("");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <>
      {actions.map((a) => {
        const Icon = ICONS[a.audit];
        return (
          <Button
            key={a.audit}
            size={size}
            variant={a.intent === "primary" ? "default" : a.intent === "destructive" ? "destructive" : "outline"}
            disabled={setStatus.isPending}
            onClick={() => (a.requiresNote ? setNoteFor(a) : run(a))}
          >
            {setStatus.isPending && setStatus.variables?.status === a.to ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              Icon && <Icon className="size-4" />
            )}
            {a.label}
          </Button>
        );
      })}

      <Dialog open={noteFor !== null} onOpenChange={(v) => !v && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{noteFor?.label} dokumen</DialogTitle>
            <DialogDescription>
              Tulis alasannya. Alasan dicatat sebagai catatan dokumen dan di audit log agar pengunggah tahu apa
              yang perlu diperbaiki.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="status-note">Alasan</Label>
            <Textarea
              id="status-note"
              autoFocus
              value={note}
              placeholder="mis. Angka di tabel 2 tidak sesuai dengan lampiran."
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)} disabled={setStatus.isPending}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={!note.trim() || setStatus.isPending}
              onClick={() => noteFor && run(noteFor, note.trim())}
            >
              {setStatus.isPending && <Loader2 className="size-4 animate-spin" />}
              {noteFor?.label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
