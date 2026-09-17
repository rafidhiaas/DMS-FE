"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { useTrash, useRestoreDocument, usePurgeDocument, useEmptyTrash } from "@/hooks/use-documents";
import { TRASH_RETENTION_DAYS } from "@/lib/domain";
import { formatBytes, formatDateTime, STATUS_META } from "@/lib/format";
import type { TrashItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileIcon } from "@/components/folders/file-icon";
import { DeleteConfirmDialog } from "@/components/folders/folder-dialogs";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

function daysLeft(purgeAt: string): number {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - Date.now()) / 86_400_000));
}

/** Halaman Sampah — dokumen terhapus disimpan N hari sebelum dibersihkan otomatis (pola Paperless). */
export function TrashView() {
  const trash = useTrash();
  const restore = useRestoreDocument();
  const purge = usePurgeDocument();
  const emptyTrash = useEmptyTrash();

  const [purgeTarget, setPurgeTarget] = useState<TrashItem | null>(null);
  const [emptyOpen, setEmptyOpen] = useState(false);

  const items = trash.data ?? [];

  function handleRestore(item: TrashItem) {
    restore.mutate(item.id, {
      onSuccess: () => toast.success(`"${item.title}" dipulihkan ke folder ${item.folder_name}.`),
      onError: (e) => toast.error(e.message),
    });
  }

  function handlePurge() {
    if (!purgeTarget) return;
    purge.mutate(purgeTarget.id, {
      onSuccess: () => {
        toast.success("Dokumen dihapus permanen.");
        setPurgeTarget(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function handleEmpty() {
    emptyTrash.mutate(undefined, {
      onSuccess: (n) => {
        toast.success(`${n} dokumen dihapus permanen.`);
        setEmptyOpen(false);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        eyebrow="Arsip"
        title="Sampah"
        description={`Dokumen yang dihapus disimpan ${TRASH_RETENTION_DAYS} hari sebelum dibersihkan otomatis. Pulihkan bila terhapus tak sengaja.`}
        actions={
          items.length > 0 ? (
            <Button variant="destructive" onClick={() => setEmptyOpen(true)} disabled={emptyTrash.isPending}>
              <Trash2 className="size-4" />
              Kosongkan sampah
            </Button>
          ) : undefined
        }
      />

      {trash.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : trash.isError ? (
        <EmptyState tone="destructive" title="Gagal memuat sampah" description="Coba muat ulang halaman." />
      ) : items.length === 0 ? (
        <EmptyState
          title="Sampah kosong"
          description="Dokumen yang Anda hapus akan muncul di sini."
          action={
            <Link href="/folders" className="text-sm underline-offset-4 hover:underline">
              Ke Folder & Dokumen
            </Link>
          }
        />
      ) : (
        <div className="rounded-lg border border-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Dokumen</TableHead>
                <TableHead>Folder asal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ukuran</TableHead>
                <TableHead>Dihapus</TableHead>
                <TableHead>Dibersihkan dalam</TableHead>
                <TableHead className="w-48 pr-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const left = daysLeft(item.purge_at);
                const busy = restore.isPending || purge.isPending;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <FileIcon extension={item.extension} />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-72 truncate font-medium">{item.title}</p>
                          <p className="font-mono text-[11px] uppercase text-muted-foreground">
                            {item.extension} · v{item.current_version}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.folder_name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={STATUS_META[item.status].className}>
                        {STATUS_META[item.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatBytes(item.size_bytes)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.deleted_at ? formatDateTime(item.deleted_at) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className={left <= 3 ? "text-destructive" : "text-muted-foreground"}>
                        {left} hari
                      </span>
                    </TableCell>
                    <TableCell className="pr-3">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => handleRestore(item)}>
                          {restore.isPending && restore.variables === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="size-3.5" />
                          )}
                          Pulihkan
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busy}
                          onClick={() => setPurgeTarget(item)}
                        >
                          <Trash2 className="size-3.5" />
                          Permanen
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteConfirmDialog
        open={purgeTarget !== null}
        onOpenChange={(v) => !v && setPurgeTarget(null)}
        title="Hapus permanen?"
        description={`Dokumen "${purgeTarget?.title ?? ""}" beserta seluruh versinya akan dihapus permanen dan tidak bisa dipulihkan.`}
        onConfirm={handlePurge}
        pending={purge.isPending}
      />
      <DeleteConfirmDialog
        open={emptyOpen}
        onOpenChange={setEmptyOpen}
        title="Kosongkan sampah?"
        description={`${items.length} dokumen di sampah akan dihapus permanen dan tidak bisa dipulihkan.`}
        onConfirm={handleEmpty}
        pending={emptyTrash.isPending}
      />
    </div>
  );
}
