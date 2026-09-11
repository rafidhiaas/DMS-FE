"use client";

import { Folder as FolderIcon } from "lucide-react";
import { formatBytes, formatDate, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DocumentItem, Folder } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileIcon } from "@/components/folders/file-icon";
import { ItemActionsMenu } from "@/components/folders/item-actions-menu";

export interface ItemHandlers {
  onOpen: (kind: "folder" | "document", id: string) => void;
  onRename: (kind: "folder" | "document", id: string, name: string) => void;
  onMove: (kind: "folder" | "document", id: string, name: string) => void;
  onDelete: (kind: "folder" | "document", id: string, name: string) => void;
}

/**
 * Tampilan tabel isi folder (mode "Tabel"): folder dulu, lalu dokumen.
 * Kolom checkbox hanya untuk dokumen — folder tidak ikut aksi massal.
 */
export function DocumentTable({
  folders,
  documents,
  canWrite,
  canDelete,
  selectable,
  selected,
  onToggle,
  onToggleAll,
  handlers,
}: {
  folders: Folder[];
  documents: DocumentItem[];
  canWrite: boolean;
  canDelete: boolean;
  selectable: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  handlers: ItemHandlers;
}) {
  const allSelected = documents.length > 0 && documents.every((d) => selected.has(d.id));
  const someSelected = documents.some((d) => selected.has(d.id));

  return (
    <div className="rounded-lg border border-rule bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10 pl-3">
                <Checkbox
                  aria-label="Pilih semua dokumen"
                  checked={allSelected}
                  indeterminate={!allSelected && someSelected}
                  disabled={documents.length === 0}
                  onCheckedChange={onToggleAll}
                />
              </TableHead>
            )}
            <TableHead className={cn(!selectable && "pl-4")}>Nama</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead className="text-right">Ukuran</TableHead>
            <TableHead className="text-right">Versi</TableHead>
            <TableHead>Diperbarui</TableHead>
            <TableHead className="w-12 pr-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.map((f) => (
            <TableRow
              key={f.id}
              className="cursor-pointer"
              onClick={() => handlers.onOpen("folder", f.id)}
            >
              {selectable && <TableCell className="pl-3" />}
              <TableCell className={cn(!selectable && "pl-4")}>
                <div className="flex items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <FolderIcon className="size-4" />
                  </span>
                  <span className="max-w-72 truncate font-medium">{f.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">—</TableCell>
              <TableCell className="font-mono text-[11px] uppercase text-muted-foreground">Folder</TableCell>
              <TableCell className="text-right text-muted-foreground">—</TableCell>
              <TableCell className="text-right text-muted-foreground">—</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(f.updated_at)}</TableCell>
              <TableCell className="pr-3">
                <ItemActionsMenu
                  canWrite={canWrite}
                  canDelete={canDelete}
                  openLabel="Buka folder"
                  onOpen={() => handlers.onOpen("folder", f.id)}
                  onRename={() => handlers.onRename("folder", f.id, f.name)}
                  onMove={() => handlers.onMove("folder", f.id, f.name)}
                  onDelete={() => handlers.onDelete("folder", f.id, f.name)}
                />
              </TableCell>
            </TableRow>
          ))}

          {documents.map((d) => {
            const status = STATUS_META[d.status];
            const isSelected = selected.has(d.id);
            return (
              <TableRow
                key={d.id}
                data-state={isSelected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => handlers.onOpen("document", d.id)}
              >
                {selectable && (
                  <TableCell className="pl-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Pilih ${d.title}`}
                      checked={isSelected}
                      onCheckedChange={() => onToggle(d.id)}
                    />
                  </TableCell>
                )}
                <TableCell className={cn(!selectable && "pl-4")}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <FileIcon extension={d.extension} />
                    </span>
                    <span className="max-w-72 truncate font-medium">{d.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-[11px] uppercase text-muted-foreground">
                  {d.extension}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatBytes(d.size_bytes)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  v{d.current_version}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(d.updated_at)}</TableCell>
                <TableCell className="pr-3">
                  <ItemActionsMenu
                    canWrite={canWrite}
                    canDelete={canDelete}
                    openLabel="Buka detail"
                    onOpen={() => handlers.onOpen("document", d.id)}
                    onRename={() => handlers.onRename("document", d.id, d.title)}
                    onMove={() => handlers.onMove("document", d.id, d.title)}
                    onDelete={() => handlers.onDelete("document", d.id, d.title)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
