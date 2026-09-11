"use client";

import { useCallback, useSyncExternalStore } from "react";
import { EMPTY_FILTERS, normalizeFilters, type ListFilters, type ViewMode } from "@/lib/list-filters";

/**
 * Tampilan Tersimpan (Saved Views) ala Paperless-ngx — filter + urutan + mode
 * tampilan sebuah folder yang diberi nama, bisa dipasang di sidebar dan dashboard.
 * Preferensi per-browser (localStorage); backend tidak perlu mengetahuinya.
 */

export interface SavedView {
  id: string;
  name: string;
  folderId: string;
  folderName: string;
  filters: ListFilters;
  view: ViewMode;
  showInSidebar: boolean;
  showOnDashboard: boolean;
  created_at: string;
}

const STORAGE_KEY = "dms_saved_views_v1";
const EMPTY: SavedView[] = [];

const listeners = new Set<() => void>();
let cache: { raw: string | null; views: SavedView[] } = { raw: null, views: EMPTY };

function readAll(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cache.raw) return cache.views;
    const parsed = raw ? (JSON.parse(raw) as SavedView[]) : EMPTY;
    const views = parsed.map((v) => ({ ...v, filters: normalizeFilters(v.filters) }));
    cache = { raw, views };
    return views;
  } catch {
    return EMPTY;
  }
}

function writeAll(views: SavedView[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    /* abaikan (mode privat) */
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/** Baca satu tampilan secara sinkron (untuk inisialisasi state di client). */
export function getSavedView(id: string | null | undefined): SavedView | null {
  if (!id || typeof window === "undefined") return null;
  return readAll().find((v) => v.id === id) ?? null;
}

export function savedViewHref(view: SavedView): string {
  return `/folders/${view.folderId}?view=${view.id}`;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `view-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSavedViews() {
  const views = useSyncExternalStore(subscribe, readAll, () => EMPTY);

  const add = useCallback(
    (input: Omit<SavedView, "id" | "created_at">): SavedView => {
      const view: SavedView = {
        ...input,
        filters: { ...EMPTY_FILTERS, ...input.filters },
        id: uuid(),
        created_at: new Date().toISOString(),
      };
      writeAll([...readAll(), view]);
      return view;
    },
    [],
  );

  const update = useCallback((id: string, patch: Partial<Omit<SavedView, "id">>) => {
    writeAll(readAll().map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const remove = useCallback((id: string) => {
    writeAll(readAll().filter((v) => v.id !== id));
  }, []);

  return { views, add, update, remove };
}
