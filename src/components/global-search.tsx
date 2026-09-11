"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CornerDownLeft, Folder as FolderIcon, Search } from "lucide-react";
import { useRecentDocuments } from "@/lib/recent-docs";
import { useSearch } from "@/hooks/use-search";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDate, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileIcon } from "@/components/folders/file-icon";

/**
 * Pencarian global (folder + dokumen) ala Paperless-ngx: satu kotak di navigasi,
 * hasil terkelompok, navigasi keyboard, pintasan Ctrl/⌘+K.
 */
export function GlobalSearch({
  tone = "sidebar",
  compact = false,
}: {
  tone?: "sidebar" | "header";
  /** Hanya ikon (sidebar ramping). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cari folder atau dokumen"
        title={compact ? "Cari (Ctrl+K)" : undefined}
        className={cn(
          "flex items-center gap-2 rounded-sm border text-left text-[13px] transition-colors",
          compact ? "size-9 justify-center" : "w-full px-3 py-2",
          tone === "sidebar"
            ? "border-sidebar-border bg-sidebar-accent/40 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
            : "h-8 w-auto border-input bg-transparent text-muted-foreground hover:bg-muted",
        )}
      >
        <Search className="size-4 shrink-0" />
        {!compact && (
          <>
            <span className="flex-1 truncate">Cari…</span>
            <kbd
              className={cn(
                "hidden rounded-sm border px-1 font-mono text-[10px] sm:inline",
                tone === "sidebar" ? "border-sidebar-border" : "border-rule",
              )}
            >
              Ctrl K
            </kbd>
          </>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[12vh] translate-y-0 gap-0 p-0 sm:max-w-xl"
        >
          <DialogTitle className="sr-only">Pencarian global</DialogTitle>
          {open && <SearchPanel key="panel" onClose={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const debounced = useDebounced(query, 150);
  const search = useSearch(debounced);
  const recent = useRecentDocuments();

  const results = search.data ?? [];
  const folders = results.filter((r) => r.kind === "folder");
  const documents = results.filter((r) => r.kind === "document");
  const ordered = [...folders, ...documents];

  function go(r: SearchResult) {
    onClose();
    router.push(r.kind === "folder" ? `/folders/${r.id}` : `/documents/${r.id}`);
  }

  const showingRecent = debounced.trim().length < 2 && query.trim() === "" && recent.length > 0;
  const listLength = showingRecent ? recent.length : ordered.length;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, listLength - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (showingRecent && recent[active]) {
        e.preventDefault();
        onClose();
        router.push(`/documents/${recent[active].id}`);
      } else if (ordered[active]) {
        e.preventDefault();
        go(ordered[active]);
      }
    }
  }

  const tooShort = debounced.trim().length < 2;
  // Indeks global untuk navigasi keyboard: folder dulu, lalu dokumen.
  const docOffset = folders.length;

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2 border-b border-rule px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Cari nama folder atau judul dokumen…"
          className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
        />
        <kbd className="hidden rounded-sm border border-rule px-1 font-mono text-[10px] text-muted-foreground sm:inline">
          Esc
        </kbd>
      </div>

      <div className="max-h-[50vh] overflow-y-auto p-2">
        {tooShort ? (
          recent.length > 0 && query.trim() === "" ? (
            <Group label="Terakhir dibuka" count={recent.length}>
              {recent.map((d, i) => (
                <Row
                  key={d.id}
                  active={i === active}
                  onHover={() => setActive(i)}
                  onSelect={() => {
                    onClose();
                    router.push(`/documents/${d.id}`);
                  }}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileIcon extension={d.extension} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.title}</span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{d.folder_name}</span>
                  </span>
                  <Clock className="size-3.5 text-muted-foreground" />
                </Row>
              ))}
            </Group>
          ) : (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Ketik minimal dua huruf untuk mulai mencari.
            </p>
          )
        ) : search.isError ? (
          <p className="px-2 py-6 text-center text-xs text-destructive">
            {getApiErrorMessage(search.error, "Pencarian gagal.")}
          </p>
        ) : ordered.length === 0 && !search.isFetching ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Tidak ada hasil untuk “{debounced}”.
          </p>
        ) : (
          <>
            {folders.length > 0 && (
              <Group label="Folder" count={folders.length}>
                {folders.map((r, i) => {
                  return (
                    <Row key={r.id} active={i === active} onHover={() => setActive(i)} onSelect={() => go(r)}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                        <FolderIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.name}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">{r.path}</span>
                      </span>
                    </Row>
                  );
                })}
              </Group>
            )}
            {documents.length > 0 && (
              <Group label="Dokumen" count={documents.length}>
                {documents.map((r, j) => {
                  const i = docOffset + j;
                  const status = STATUS_META[r.status];
                  return (
                    <Row key={r.id} active={i === active} onHover={() => setActive(i)} onSelect={() => go(r)}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <FileIcon extension={r.extension} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.title}</span>
                        <span className="block truncate font-mono text-[11px] text-muted-foreground">
                          {r.folder_name} · {formatDate(r.updated_at)}
                        </span>
                      </span>
                      <Badge variant="secondary" className={cn("hidden sm:inline-flex", status.className)}>
                        {status.label}
                      </Badge>
                    </Row>
                  );
                })}
              </Group>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-rule px-3 py-2 font-mono text-[10.5px] text-muted-foreground">
        <span>↑↓ pilih</span>
        <span className="flex items-center gap-1">
          <CornerDownLeft className="size-3" /> buka
        </span>
      </div>
    </div>
  );
}

function Group({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="eyebrow flex items-center gap-2 px-2 py-1.5">
        {label}
        <span className="text-muted-foreground/70">{count}</span>
      </p>
      {children}
    </div>
  );
}

function Row({
  active,
  onHover,
  onSelect,
  children,
}: {
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors",
        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
      )}
    >
      {children}
    </button>
  );
}
