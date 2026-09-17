"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import {
  useDocumentShares,
  useShareDocument,
  useUpdateShareAccess,
  useRevokeShare,
} from "@/hooks/use-shares";
import { useUserSearch } from "@/hooks/use-users";
import { ACCESS_LEVEL_META, ROLE_BADGE_CLASS } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AccessLevel, DocumentShare } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACCESS_LEVELS: AccessLevel[] = ["VIEWER", "DOWNLOADER", "EDITOR"];
/* `items` agar trigger Select menampilkan label, bukan nilai mentah (Base UI). */
const LEVEL_ITEMS = ACCESS_LEVELS.map((l) => ({ value: l, label: ACCESS_LEVEL_META[l].label }));

/** Dialog kelola akses berbagi satu dokumen: tambah penerima, ubah level, cabut. */
export function ShareDialog({
  documentId,
  documentTitle,
  currentUserId,
  open,
  onOpenChange,
}: {
  documentId: string;
  documentTitle: string;
  currentUserId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const shares = useDocumentShares(documentId, open);
  const shareDocument = useShareDocument(documentId);
  const updateAccess = useUpdateShareAccess(documentId);
  const revokeShare = useRevokeShare(documentId);
  const users = useUserSearch("", open);

  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [level, setLevel] = useState<AccessLevel>("VIEWER");

  const candidates = (users.data ?? []).filter((u) => u.id !== currentUserId);
  const userItems = candidates.map((u) => ({ value: u.id, label: `${u.name} · ${u.email}` }));

  function handleShare() {
    if (!targetUserId) return;
    shareDocument.mutate(
      { user_id: targetUserId, access_level: level },
      {
        onSuccess: () => {
          toast.success("Dokumen berhasil dibagikan.");
          setTargetUserId(null);
          setLevel("VIEWER");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bagikan Dokumen</DialogTitle>
          <DialogDescription>
            Atur siapa saja yang dapat mengakses “{documentTitle}”.
          </DialogDescription>
        </DialogHeader>

        {/* Tambah penerima baru */}
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="space-y-2">
              <Label>Pengguna</Label>
              <Select
                value={targetUserId}
                items={userItems}
                onValueChange={(v) => setTargetUserId(v as string | null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih pengguna..." />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} · {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level Akses</Label>
              <Select value={level} items={LEVEL_ITEMS} onValueChange={(v) => setLevel(v as AccessLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {ACCESS_LEVEL_META[l].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {ACCESS_LEVEL_META[level].description}
          </p>
          <Button
            className="w-full"
            disabled={!targetUserId || shareDocument.isPending}
            onClick={handleShare}
          >
            {shareDocument.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            Bagikan
          </Button>
        </div>

        <Separator />

        {/* Daftar penerima saat ini */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Memiliki akses</p>
          {shares.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          ) : (shares.data?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Belum dibagikan ke siapa pun.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {shares.data!.map((share) => (
                <ShareRow
                  key={share.id}
                  share={share}
                  pending={updateAccess.isPending || revokeShare.isPending}
                  onChangeLevel={(access_level) =>
                    updateAccess.mutate(
                      { shareId: share.id, access_level },
                      {
                        onSuccess: () => toast.success("Level akses diperbarui."),
                        onError: (e) => toast.error(e.message),
                      },
                    )
                  }
                  onRevoke={() =>
                    revokeShare.mutate(share.id, {
                      onSuccess: () => toast.success("Akses dicabut."),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareRow({
  share,
  pending,
  onChangeLevel,
  onRevoke,
}: {
  share: DocumentShare;
  pending: boolean;
  onChangeLevel: (level: AccessLevel) => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{share.user?.name ?? share.user_id}</p>
        <p className="truncate text-xs text-muted-foreground">
          {share.user?.email ?? "-"}
        </p>
      </div>
      {share.user && (
        <Badge
          variant="secondary"
          className={cn("hidden shrink-0 sm:inline-flex", ROLE_BADGE_CLASS[share.user.role])}
        >
          {ROLE_LABELS[share.user.role]}
        </Badge>
      )}
      <Select
        value={share.access_level}
        items={LEVEL_ITEMS}
        onValueChange={(v) => onChangeLevel(v as AccessLevel)}
      >
        <SelectTrigger size="sm" disabled={pending} className="shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACCESS_LEVELS.map((l) => (
            <SelectItem key={l} value={l}>
              {ACCESS_LEVEL_META[l].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-destructive hover:text-destructive"
        disabled={pending}
        onClick={onRevoke}
        title="Cabut akses"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
