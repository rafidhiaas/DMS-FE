"use client";

import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Menu titik-tiga per item (folder/dokumen) — dipakai kartu maupun baris tabel. */
export function ItemActionsMenu({
  canWrite,
  canDelete,
  openLabel,
  onOpen,
  onRename,
  onDelete,
}: {
  canWrite: boolean;
  canDelete: boolean;
  openLabel: string;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        aria-label="Aksi lainnya"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8 shrink-0")}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onOpen}>
          <ExternalLink className="size-4" />
          {openLabel}
        </DropdownMenuItem>
        {canWrite && (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="size-4" />
            Ganti nama
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="size-4" />
              Hapus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
