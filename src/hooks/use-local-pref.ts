"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferensi UI per-browser (mode tampilan, dsb) yang disimpan di localStorage.
 * Memakai useSyncExternalStore agar render server & client konsisten
 * (server selalu memakai nilai default) tanpa setState di dalam useEffect.
 */

const listeners = new Set<() => void>();

function emit() {
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

export function useLocalPref<T extends string>(
  key: string,
  fallback: T,
  allowed?: readonly T[],
): [T, (value: T) => void] {
  const read = useCallback((): T => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw && (!allowed || (allowed as readonly string[]).includes(raw))) return raw as T;
    } catch {
      /* localStorage bisa terblokir (mode privat) — pakai default */
    }
    return fallback;
  }, [key, fallback, allowed]);

  const value = useSyncExternalStore(subscribe, read, () => fallback);

  const set = useCallback(
    (next: T) => {
      try {
        window.localStorage.setItem(key, next);
      } catch {
        /* abaikan */
      }
      emit();
    },
    [key],
  );

  return [value, set];
}
