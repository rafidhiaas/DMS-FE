"use client";

import { Download, FolderInput, Loader2, Tags, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bilah aksi massal — muncul saat ada dokumen terpilih, menggantikan toolbar
 * (pola Paperless-ngx: bar "Edit:" menimpa bar filter).
 */
export function BulkActionBar({
  count,
  total,
  canWrite,
  canDelete,
  busy,
  onSelectAll,
  onClear,
  onDownload,
  onMove,
  onEditMeta,
  onDelete,
}: {
  count: number;
  total: number;
  canWrite: boolean;
  canDelete: boolean;
  busy: boolean;
  onSelectAll: () => void;
  onClear: () => void;
  onDownload: () => void;
  onMove: () => void;
  onEditMeta: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Aksi massal"
      className="rise flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2"
    >
      <span className="font-mono text-[11.5px] text-primary">
        {count} dari {total} dokumen dipilih
      </span>
      {count < total && (
        <Button variant="link" size="sm" className="h-auto px-1" onClick={onSelectAll}>
          Pilih semua
        </Button>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={busy} onClick={onDownload}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          Unduh
        </Button>
        {canWrite && (
          <>
            <Button variant="outline" size="sm" disabled={busy} onClick={onEditMeta}>
              <Tags className="size-3.5" />
              Metadata
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={onMove}>
              <FolderInput className="size-3.5" />
              Pindahkan
            </Button>
          </>
        )}
        {canDelete && (
          <Button variant="destructive" size="sm" disabled={busy} onClick={onDelete}>
            <Trash2 className="size-3.5" />
            Hapus
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Batalkan pilihan">
          <X className="size-3.5" />
          Batal
        </Button>
      </div>
    </div>
  );
}
