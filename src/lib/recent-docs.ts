"use client";

import { useSyncExternalStore } from "react";

/**
 * "Terakhir dibuka" — jejak dokumen yang dibuka pengguna di browser ini.
 * Dipakai widget dashboard dan pencarian global (saat kotak masih kosong).
 */

export interface RecentDoc {
  id: string;
  title: string;
  extension: string;
  folder_name: string;
  opened_at: string;
}

const STORAGE_KEY = "dms_recent_docs_v1";
const MAX = 8;
const EMPTY: RecentDoc[] = [];

const listeners = new Set<() => void>();
let cache: { raw: string | null; items: RecentDoc[] } = { raw: null, items: EMPTY };

function readAll(): RecentDoc[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cache.raw) return cache.items;
    const items = raw ? (JSON.parse(raw) as RecentDoc[]) : EMPTY;
    cache = { raw, items };
    return items;
  } catch {
    return EMPTY;
  }
}

function writeAll(items: RecentDoc[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* abaikan */
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

/** Catat dokumen yang baru dibuka (dipanggil halaman detail). */
export function recordRecentDocument(doc: Omit<RecentDoc, "opened_at">): void {
  if (typeof window === "undefined") return;
  const rest = readAll().filter((d) => d.id !== doc.id);
  writeAll([{ ...doc, opened_at: new Date().toISOString() }, ...rest].slice(0, MAX));
}

/** Hapus dari daftar (mis. dokumen sudah tidak ada). */
export function forgetRecentDocument(id: string): void {
  if (typeof window === "undefined") return;
  writeAll(readAll().filter((d) => d.id !== id));
}

export function useRecentDocuments(): RecentDoc[] {
  return useSyncExternalStore(subscribe, readAll, () => EMPTY);
}
