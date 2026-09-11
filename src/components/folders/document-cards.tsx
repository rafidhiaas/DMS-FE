"use client";

import { Building2, CalendarDays, FileType, Folder as FolderIcon } from "lucide-react";
import { useDocumentTypes, useCorrespondents } from "@/hooks/use-meta";
import { formatBytes, formatDate, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DocumentItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ItemActionsMenu } from "@/components/folders/item-actions-menu";
import { DocumentThumbnail } from "@/components/folders/document-thumbnail";
import { DocumentTags } from "@/components/metadata/tag-chip";

export interface DocumentCardProps {
  doc: DocumentItem;
  /** Nama folder asal (daftar lintas folder). */
  folderName?: string;
  canWrite: boolean;
  canDelete: boolean;
  selectable: boolean;
  selected: boolean;
  anySelected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}

/** Kartu kecil (grid) ala Paperless: thumbnail di atas, judul + tag + meta di bawah. */
export function DocumentCard(props: DocumentCardProps) {
  const { doc, folderName, canWrite, canDelete, selectable, selected, anySelected, onToggle, onOpen, onRename, onMove, onDelete } = props;
  const status = STATUS_META[doc.status];
  return (
    <div
      role="button"
      tabIndex={0}
      data-selected={selected || undefined}
      onClick={anySelected ? onToggle : onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring",
        selected && "border-primary/60 ring-2 ring-primary/30",
      )}
    >
      <DocumentThumbnail doc={doc} className="aspect-[3/4] w-full border-b" />

      {selectable && (
        <span
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-2 left-2 rounded-sm bg-background/90 p-0.5 transition-opacity",
            selected || anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          <Checkbox aria-label={`Pilih ${doc.title}`} checked={selected} onCheckedChange={onToggle} />
        </span>
      )}
      <span className="absolute top-1.5 right-1.5">
        <Badge variant="secondary" className={cn("bg-background/90 px-1 text-[9.5px]", status.className)}>
          {status.label}
        </Badge>
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 truncate text-[13px] font-medium" title={doc.title}>
            {doc.title}
          </p>
          <span className="-mr-1.5 -mt-1.5">
            <ItemActionsMenu
              canWrite={canWrite}
              canDelete={canDelete}
              openLabel="Buka detail"
              onOpen={onOpen}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          </span>
        </div>
        <DocumentTags tagIds={doc.tag_ids} max={2} />
        <div className="mt-auto flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[10px] text-muted-foreground">
          <span className="uppercase">{doc.extension}</span>
          <span>·</span>
          <span>{formatBytes(doc.size_bytes)}</span>
          <span>·</span>
          <span>{formatDate(doc.document_date ?? doc.updated_at)}</span>
        </div>
        {folderName && <p className="truncate font-mono text-[10px] text-muted-foreground">{folderName}</p>}
      </div>
    </div>
  );
}

/** Kartu besar (daftar) ala Paperless: thumbnail tinggi di kiri, metadata lengkap di kanan. */
export function DocumentCardLarge(props: DocumentCardProps) {
  const { doc, folderName, canWrite, canDelete, selectable, selected, anySelected, onToggle, onOpen, onRename, onMove, onDelete } = props;
  const status = STATUS_META[doc.status];
  const types = useDocumentTypes();
  const correspondents = useCorrespondents();
  const typeName = types.data?.find((t) => t.id === doc.document_type_id)?.name;
  const corrName = correspondents.data?.find((c) => c.id === doc.correspondent_id)?.name;

  return (
    <div
      role="button"
      tabIndex={0}
      data-selected={selected || undefined}
      onClick={anySelected ? onToggle : onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      className={cn(
        "group relative flex gap-4 overflow-hidden rounded-xl border bg-card p-3 text-left transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring sm:p-4",
        selected && "border-primary/60 ring-2 ring-primary/30",
      )}
    >
      <div className="relative w-28 shrink-0 sm:w-36">
        <DocumentThumbnail doc={doc} fit="contain" className="aspect-[3/4] w-full rounded-md border" />
        {selectable && (
          <span
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "absolute top-1.5 left-1.5 rounded-sm bg-background/90 p-0.5 transition-opacity",
              selected || anySelected ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
            )}
          >
            <Checkbox aria-label={`Pilih ${doc.title}`} checked={selected} onCheckedChange={onToggle} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium" title={doc.title}>
              {doc.title}
            </p>
            <DocumentTags tagIds={doc.tag_ids} max={5} size="sm" className="mt-1" />
          </div>
          <Badge variant="secondary" className={cn("shrink-0", status.className)}>
            {status.label}
          </Badge>
          <ItemActionsMenu
            canWrite={canWrite}
            canDelete={canDelete}
            openLabel="Buka detail"
            onOpen={onOpen}
            onRename={onRename}
            onMove={onMove}
            onDelete={onDelete}
          />
        </div>

        {doc.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
        )}

        <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] sm:grid-cols-3">
          <Meta icon={<CalendarDays className="size-3.5" />} label="Tanggal">
            {formatDate(doc.document_date ?? doc.created_at)}
          </Meta>
          <Meta icon={<FileType className="size-3.5" />} label="Tipe">
            {typeName ?? <span className="text-muted-foreground">—</span>}
          </Meta>
          <Meta icon={<Building2 className="size-3.5" />} label="Pihak">
            {corrName ?? <span className="text-muted-foreground">—</span>}
          </Meta>
          {folderName && (
            <Meta icon={<FolderIcon className="size-3.5" />} label="Folder">
              {folderName}
            </Meta>
          )}
          <div className="col-span-2 flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted-foreground sm:col-span-3">
            <span className="uppercase">{doc.extension}</span>
            <span>·</span>
            <span>{formatBytes(doc.size_bytes)}</span>
            <span>·</span>
            <span>v{doc.current_version}</span>
            {doc.asn != null && (
              <>
                <span>·</span>
                <span>ASN #{doc.asn}</span>
              </>
            )}
            <span>·</span>
            <span>diperbarui {formatDate(doc.updated_at)}</span>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Meta({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}
