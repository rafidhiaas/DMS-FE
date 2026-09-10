"use client";

import { useQuery } from "@tanstack/react-query";
import { searchAll } from "@/lib/api/search";

/** Pencarian global; query di-debounce oleh pemanggil (lihat GlobalSearch). */
export function useSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["search", q],
    queryFn: () => searchAll(q),
    enabled: q.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
