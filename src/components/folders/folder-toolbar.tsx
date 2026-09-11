"use client";

import {
  ArrowUpDown,
  Bookmark,
  Building2,
  Calendar,
  ChevronDown,
  CircleDot,
  FileType,
  LayoutGrid,
  LayoutList,
  List,
  Search,
  Tag,
  X,
} from "lucide-react";
import { STATUS_META } from "@/lib/format";
import { useTags, useDocumentTypes, useCorrespondents } from "@/hooks/use-meta";
import {
  clearedFilters,
  hasActiveFilters,
  SORT_LABELS,
  type ListFilters,
  type SortKey,
  type ViewMode,
} from "@/lib/list-filters";
import { TagChip } from "@/components/metadata/tag-chip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUSES = Object.keys(STATUS_META) as DocumentStatus[];

/**
 * Baris kontrol daftar: cari, filter chip (status, tipe), urutan, mode tampilan.
 * Meniru bar filter Paperless-ngx tapi hanya dengan atribut yang kita punya.
 */
export function FolderToolbar({
  filters,
  onChange,
  availableExtensions,
  view,
  onViewChange,
  total,
  shown,
  activeViewName,
  onSaveView,
  onClearView,
  showDateFilter = false,
  searchPlaceholder = "Cari di folder ini…",
}: {
  filters: ListFilters;
  onChange: (next: ListFilters) => void;
  availableExtensions: string[];
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  total: number;
  shown: number;
  /** Nama Tampilan Tersimpan yang sedang diterapkan (jika ada). */
  activeViewName?: string | null;
  onSaveView?: () => void;
  onClearView?: () => void;
  /** Tampilkan filter rentang tanggal (halaman Semua Dokumen). */
  showDateFilter?: boolean;
  searchPlaceholder?: string;
}) {
  const active = hasActiveFilters(filters);
  const tags = useTags();
  const types = useDocumentTypes();
  const correspondents = useCorrespondents();

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="pl-8"
        />
        {filters.query && (
          <button
            type="button"
            aria-label="Bersihkan pencarian"
            onClick={() => onChange({ ...filters, query: "" })}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <FilterChip
        icon={<CircleDot className="size-3.5" />}
        label="Status"
        count={filters.statuses.length}
      >
        <DropdownMenuLabel>Status dokumen</DropdownMenuLabel>
        {STATUSES.map((s) => (
          <DropdownMenuCheckboxItem
            key={s}
            checked={filters.statuses.includes(s)}
            onCheckedChange={() => onChange({ ...filters, statuses: toggle(filters.statuses, s) })}
          >
            {STATUS_META[s].label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterChip>

      <FilterChip
        icon={<FileType className="size-3.5" />}
        label="Format"
        count={filters.extensions.length}
        disabled={availableExtensions.length === 0}
      >
        <DropdownMenuLabel>Format berkas</DropdownMenuLabel>
        {availableExtensions.map((ext) => (
          <DropdownMenuCheckboxItem
            key={ext}
            checked={filters.extensions.includes(ext)}
            onCheckedChange={() =>
              onChange({ ...filters, extensions: toggle(filters.extensions, ext) })
            }
          >
            <span className="uppercase">{ext}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </FilterChip>

      <FilterChip
        icon={<Tag className="size-3.5" />}
        label="Tag"
        count={filters.tagIds.length}
        disabled={(tags.data ?? []).length === 0}
      >
        <DropdownMenuLabel>Tag</DropdownMenuLabel>
        {(tags.data ?? []).map((t) => (
          <DropdownMenuCheckboxItem
            key={t.id}
            checked={filters.tagIds.includes(t.id)}
            onCheckedChange={() => onChange({ ...filters, tagIds: toggle(filters.tagIds, t.id) })}
          >
            <TagChip tag={t} />
          </DropdownMenuCheckboxItem>
        ))}
      </FilterChip>

      <FilterChip
        icon={<FileType className="size-3.5" />}
        label="Tipe dokumen"
        count={filters.typeIds.length}
        disabled={(types.data ?? []).length === 0}
      >
        <DropdownMenuLabel>Tipe dokumen</DropdownMenuLabel>
        {(types.data ?? []).map((t) => (
          <DropdownMenuCheckboxItem
            key={t.id}
            checked={filters.typeIds.includes(t.id)}
            onCheckedChange={() => onChange({ ...filters, typeIds: toggle(filters.typeIds, t.id) })}
          >
            {t.name}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterChip>

      <FilterChip
        icon={<Building2 className="size-3.5" />}
        label="Pihak"
        count={filters.correspondentIds.length}
        disabled={(correspondents.data ?? []).length === 0}
      >
        <DropdownMenuLabel>Pihak</DropdownMenuLabel>
        {(correspondents.data ?? []).map((c) => (
          <DropdownMenuCheckboxItem
            key={c.id}
            checked={filters.correspondentIds.includes(c.id)}
            onCheckedChange={() =>
              onChange({ ...filters, correspondentIds: toggle(filters.correspondentIds, c.id) })
            }
          >
            {c.name}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterChip>

      {showDateFilter && (
        <FilterChip
          icon={<Calendar className="size-3.5" />}
          label="Tanggal"
          count={(filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0)}
        >
          <DropdownMenuLabel>Tanggal dokumen</DropdownMenuLabel>
          <div className="space-y-2 px-1.5 py-1" onKeyDown={(e) => e.stopPropagation()}>
            <div className="space-y-1">
              <Label htmlFor="date-from" className="text-xs">Dari</Label>
              <Input
                id="date-from"
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-to" className="text-xs">Sampai</Label>
              <Input
                id="date-to"
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                className="h-8"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Memakai tanggal dokumen; bila kosong, tanggal dibuat.</p>
          </div>
        </FilterChip>
      )}

      <FilterChip icon={<ArrowUpDown className="size-3.5" />} label={SORT_LABELS[filters.sort]}>
        <DropdownMenuLabel>Urutkan</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={filters.sort}
          onValueChange={(v) => onChange({ ...filters, sort: v as SortKey })}
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <DropdownMenuRadioItem key={k} value={k}>
              {SORT_LABELS[k]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </FilterChip>

      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(clearedFilters(filters))}
        >
          <X className="size-3.5" />
          Reset
        </Button>
      )}

      {activeViewName && (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2 py-1 text-[12px] text-primary">
          <Bookmark className="size-3.5" />
          <span className="max-w-40 truncate">{activeViewName}</span>
          {onClearView && (
            <button
              type="button"
              aria-label="Lepas tampilan tersimpan"
              onClick={onClearView}
              className="rounded-sm opacity-70 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      )}

      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
        {active ? `${shown} dari ${total}` : `${total} item`}
      </span>

      {onSaveView && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveView}
          title="Simpan filter & urutan ini sebagai Tampilan Tersimpan"
        >
          <Bookmark className="size-3.5" />
          <span className="hidden sm:inline">Simpan tampilan</span>
        </Button>
      )}

      <div
        role="group"
        aria-label="Mode tampilan"
        className="flex overflow-hidden rounded-lg border border-input"
      >
        <ViewButton active={view === "grid"} onClick={() => onViewChange("grid")} label="Kartu">
          <LayoutGrid className="size-4" />
        </ViewButton>
        <ViewButton active={view === "large"} onClick={() => onViewChange("large")} label="Kartu besar">
          <LayoutList className="size-4" />
        </ViewButton>
        <ViewButton active={view === "table"} onClick={() => onViewChange("table")} label="Tabel">
          <List className="size-4" />
        </ViewButton>
      </div>
    </div>
  );
}

function FilterChip({
  icon,
  label,
  count,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const on = (count ?? 0) > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          on && "border-primary/60 bg-primary/5 text-primary hover:text-primary",
        )}
      >
        {icon}
        {label}
        {on && <span className="font-mono text-[10.5px]">{count}</span>}
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {/* Base UI mewajibkan GroupLabel berada di dalam Group. */}
        <DropdownMenuGroup>{children}</DropdownMenuGroup>
        {on && (
          <>
            <DropdownMenuSeparator />
            <p className="px-1.5 py-1 text-[11px] text-muted-foreground">Klik lagi untuk melepas.</p>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex h-8 w-9 items-center justify-center transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
