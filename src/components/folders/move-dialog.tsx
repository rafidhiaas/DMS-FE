"use client";

import { useState } from "react";
import { ChevronRight, Folder as FolderIcon, FolderInput, Home, Loader2 } from "lucide-react";
import { useAllFolders } from "@/hooks/use-folders";
import { cn } from "@/lib/utils";
import type { Folder } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Kumpulkan id folder beserta seluruh turunannya (untuk melarang memindah ke diri sendiri). */
function collectDescendants(folders: Folder[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (f.parent_folder_id && out.has(f.parent_folder_id) && !out.has(f.id)) {
        out.add(f.id);
        changed = true;
      }
    }
  }
  return out;
}

interface TreeRow {
  folder: Folder;
  depth: number;
}

function flattenTree(folders: Folder[]): TreeRow[] {
  const rows: TreeRow[] = [];
  const byParent = new Map<string | null, Folder[]>();
  for (const f of folders) {
    const key = f.parent_folder_id ?? null;
    byParent.set(key, [...(byParent.get(key) ?? []), f]);
  }
  const walk = (parent: string | null, depth: number) => {
    const kids = (byParent.get(parent) ?? []).sort((a, b) => a.name.localeCompare(b.name));
    for (const k of kids) {
      rows.push({ folder: k, depth });
      walk(k.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

/**
 * Dialog "Pindahkan ke folder" — pohon folder rata dengan indentasi.
 * Dipakai untuk memindahkan dokumen (satu/massal) maupun folder.
 */
export function MoveDialog({
  open,
  onOpenChange,
  title,
  description,
  /** Folder yang sedang dipindahkan (beserta turunannya tidak boleh jadi tujuan). */
  movingFolderId,
  /** Folder asal — ditandai agar pengguna tahu posisi saat ini. */
  currentFolderId,
  /** Izinkan tujuan Root (hanya untuk memindah folder; dokumen wajib di dalam folder). */
  allowRoot,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  movingFolderId?: string;
  currentFolderId: string | null;
  allowRoot: boolean;
  onSubmit: (targetFolderId: string | null) => void;
  pending: boolean;
}) {
  const folders = useAllFolders(open);
  const [target, setTarget] = useState<string | null | undefined>(undefined);

  const all = folders.data ?? [];
  const blocked = movingFolderId ? collectDescendants(all, movingFolderId) : new Set<string>();
  const rows = flattenTree(all);
  const chosen = target !== undefined;
  const unchanged = chosen && target === currentFolderId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="size-4" />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div
          role="listbox"
          aria-label="Pilih folder tujuan"
          className="max-h-72 overflow-y-auto rounded-lg border"
        >
          {folders.isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 rounded-md" />
              ))}
            </div>
          ) : folders.isError ? (
            <p className="p-3 text-sm text-destructive">Gagal memuat daftar folder.</p>
          ) : (
            <>
              {allowRoot && (
                <TreeItem
                  depth={0}
                  icon={<Home className="size-4" />}
                  label="Root (tingkat teratas)"
                  selected={chosen && target === null}
                  current={currentFolderId === null}
                  onSelect={() => setTarget(null)}
                />
              )}
              {rows.map(({ folder, depth }) => (
                <TreeItem
                  key={folder.id}
                  depth={allowRoot ? depth + 1 : depth}
                  icon={<FolderIcon className="size-4 text-amber-600 dark:text-amber-400" />}
                  label={folder.name}
                  selected={target === folder.id}
                  current={currentFolderId === folder.id}
                  disabled={blocked.has(folder.id)}
                  onSelect={() => setTarget(folder.id)}
                />
              ))}
              {rows.length === 0 && !allowRoot && (
                <p className="p-3 text-sm text-muted-foreground">Belum ada folder tujuan.</p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button
            disabled={!chosen || unchanged || pending}
            onClick={() => chosen && onSubmit(target)}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Pindahkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TreeItem({
  depth,
  icon,
  label,
  selected,
  current,
  disabled,
  onSelect,
}: {
  depth: number;
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  current: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onSelect}
      style={{ paddingLeft: `${12 + depth * 18}px` }}
      className={cn(
        "flex w-full items-center gap-2 py-2 pr-3 text-left text-sm transition-colors",
        selected ? "bg-primary/10 text-primary" : "hover:bg-accent",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {depth > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" />}
      {icon}
      <span className="truncate">{label}</span>
      {current && (
        <span className="ml-auto font-mono text-[10.5px] text-muted-foreground">saat ini</span>
      )}
    </button>
  );
}
