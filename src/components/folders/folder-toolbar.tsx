"use client";

import {
  ArrowUpDown,
  ChevronDown,
  FileType,
  LayoutGrid,
  List,
  Search,
  Tag,
  X,
} from "lucide-react";
import { STATUS_META } from "@/lib/format";
import {
  hasActiveFilters,
  SORT_LABELS,
  type ListFilters,
  type SortKey,
  type ViewMode,
} from "@/lib/list-filters";
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
}: {
  filters: ListFilters;
  onChange: (next: ListFilters) => void;
  availableExtensions: string[];
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  total: number;
  shown: number;
}) {
  const active = hasActiveFilters(filters);

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
          placeholder="Cari di folder ini…"
          aria-label="Cari di folder ini"
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
        icon={<Tag className="size-3.5" />}
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
        label="Tipe"
        count={filters.extensions.length}
        disabled={availableExtensions.length === 0}
      >
        <DropdownMenuLabel>Tipe berkas</DropdownMenuLabel>
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
          onClick={() => onChange({ ...filters, query: "", statuses: [], extensions: [] })}
        >
          <X className="size-3.5" />
          Reset
        </Button>
      )}

      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
        {active ? `${shown} dari ${total}` : `${total} item`}
      </span>

      <div
        role="group"
        aria-label="Mode tampilan"
        className="flex overflow-hidden rounded-lg border border-input"
      >
        <ViewButton active={view === "grid"} onClick={() => onViewChange("grid")} label="Kartu">
          <LayoutGrid className="size-4" />
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
