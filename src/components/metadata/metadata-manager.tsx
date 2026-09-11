"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, FileType, Loader2, Pencil, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { useMeta, useCreateMeta, useUpdateMeta, useDeleteMeta } from "@/hooks/use-meta";
import { META_LABEL, TAG_COLORS } from "@/lib/mocks/meta-store";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MetaItem, MetaKind } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/folders/folder-dialogs";
import { TagChip } from "@/components/metadata/tag-chip";
import { EmptyState } from "@/components/empty-state";

const KINDS: Array<{ kind: MetaKind; icon: React.ComponentType<{ className?: string }>; hint: string }> = [
  { kind: "tag", icon: TagIcon, hint: "Label bebas berwarna; satu dokumen bisa punya banyak tag." },
  { kind: "type", icon: FileType, hint: "Jenis dokumen, mis. Laporan, Kontrak, Surat. Satu per dokumen." },
  { kind: "correspondent", icon: Building2, hint: "Pihak lawan / asal dokumen, mis. vendor, bank, instansi." },
];

/** Halaman kelola metadata: tiga tab (Tag, Tipe Dokumen, Pihak) — pola "Manage" Paperless. */
export function MetadataManager({ canWrite }: { canWrite: boolean }) {
  return (
    <Tabs defaultValue="tag">
      <TabsList variant="line" className="-mb-px w-full flex-wrap justify-start border-b border-rule">
        {KINDS.map(({ kind, icon: Icon }) => (
          <TabsTrigger key={kind} value={kind} className="flex-none">
            <Icon data-icon="inline-start" />
            {META_LABEL[kind].plural}
          </TabsTrigger>
        ))}
      </TabsList>
      {KINDS.map(({ kind, hint }) => (
        <TabsContent key={kind} value={kind} className="pt-5">
          <MetaList kind={kind} hint={hint} canWrite={canWrite} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function MetaList({ kind, hint, canWrite }: { kind: MetaKind; hint: string; canWrite: boolean }) {
  const items = useMeta(kind);
  const remove = useDeleteMeta(kind);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MetaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetaItem | null>(null);
  const label = META_LABEL[kind];

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${label.singular} "${deleteTarget.name}" dihapus.`);
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{hint}</p>
        {canWrite && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            {label.singular} baru
          </Button>
        )}
      </div>

      {items.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : items.isError ? (
        <EmptyState tone="destructive" title={`Gagal memuat ${label.plural.toLowerCase()}`} />
      ) : (items.data ?? []).length === 0 ? (
        <EmptyState
          title={`Belum ada ${label.plural.toLowerCase()}`}
          description={canWrite ? `Buat ${label.singular.toLowerCase()} pertama untuk mulai menandai dokumen.` : undefined}
        />
      ) : (
        <div className="rounded-lg border border-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead className="text-right">Dokumen</TableHead>
                <TableHead>Dibuat</TableHead>
                {canWrite && <TableHead className="w-28 pr-3 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.data!.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="pl-4">
                    {kind === "tag" ? (
                      <TagChip tag={it} />
                    ) : (
                      <span className="font-medium">{it.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {it.document_count ?? 0}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(it.created_at)}</TableCell>
                  {canWrite && (
                    <TableCell className="pr-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-8" aria-label="Ubah" onClick={() => setEditTarget(it)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label="Hapus"
                          onClick={() => setDeleteTarget(it)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <MetaFormDialog
        key={`create-${kind}-${createOpen}`}
        kind={kind}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <MetaFormDialog
        key={`edit-${kind}-${editTarget?.id ?? "none"}`}
        kind={kind}
        open={editTarget !== null}
        onOpenChange={(v) => !v && setEditTarget(null)}
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Hapus ${label.singular.toLowerCase()}?`}
        description={`"${deleteTarget?.name ?? ""}" akan dilepas dari ${deleteTarget?.document_count ?? 0} dokumen. Dokumennya sendiri tidak dihapus.`}
        onConfirm={handleDelete}
        pending={remove.isPending}
      />
    </div>
  );
}

/** Dialog buat/ubah item metadata (nama + warna untuk tag). Juga dipakai inline dari dialog metadata dokumen. */
export function MetaFormDialog({
  kind,
  open,
  onOpenChange,
  initial,
  onCreated,
}: {
  kind: MetaKind;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: MetaItem;
  onCreated?: (item: MetaItem) => void;
}) {
  const create = useCreateMeta(kind);
  const update = useUpdateMeta(kind);
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<string>(initial?.color ?? TAG_COLORS[5]);
  const label = META_LABEL[kind];
  const pending = create.isPending || update.isPending;

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const opts = {
      onError: (e: Error) => toast.error(e.message),
    };
    if (initial) {
      update.mutate(
        { id: initial.id, name: trimmed, ...(kind === "tag" ? { color } : {}) },
        {
          ...opts,
          onSuccess: () => {
            toast.success(`${label.singular} diperbarui.`);
            onOpenChange(false);
          },
        },
      );
    } else {
      create.mutate(
        { name: trimmed, ...(kind === "tag" ? { color } : {}) },
        {
          ...opts,
          onSuccess: (item) => {
            toast.success(`${label.singular} "${item.name}" dibuat.`);
            onCreated?.(item);
            onOpenChange(false);
          },
        },
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? `Ubah ${label.singular.toLowerCase()}` : `${label.singular} baru`}</DialogTitle>
          <DialogDescription>
            {kind === "tag"
              ? "Nama singkat dan warna agar mudah dikenali di daftar dokumen."
              : `Nama ${label.singular.toLowerCase()} harus unik.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-name">Nama</Label>
            <Input
              id="meta-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={kind === "tag" ? "mis. Penting" : kind === "type" ? "mis. Laporan" : "mis. PT Mitra Sejahtera"}
            />
          </div>
          {kind === "tag" && (
            <div className="space-y-2">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Warna tag">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={color === c}
                    aria-label={c}
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      "size-7 rounded-full border-2 transition-transform",
                      color === c ? "scale-110 border-foreground" : "border-transparent hover:scale-105",
                    )}
                  />
                ))}
              </div>
              <div className="pt-1">
                <TagChip tag={{ name: name.trim() || "contoh", color }} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {initial ? "Simpan" : "Buat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
