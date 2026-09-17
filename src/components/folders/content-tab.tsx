"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { fetchDocumentContent } from "@/lib/api/documents";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function useDocumentContent(documentId: string) {
  return useQuery({
    queryKey: ["document-content", documentId],
    queryFn: () => fetchDocumentContent(documentId),
    staleTime: 60_000,
  });
}

/** Tab "Konten" — teks hasil ekstraksi berkas (pengganti OCR) dengan pencarian & sorotan. */
export function ContentTab({ documentId }: { documentId: string }) {
  const content = useDocumentContent(documentId);
  const [q, setQ] = useState("");

  if (content.isLoading) return <Skeleton className="h-48 rounded-lg" />;
  if (!content.data) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada teks terindeks. Server mengekstrak teks dari berkas teks (txt, csv, md, json), PDF, dan DOCX saat
        diunggah. Gambar dan PDF hasil scan (tanpa lapisan teks) belum didukung — perlu OCR.
      </p>
    );
  }

  const text = content.data;
  const parts = highlight(text, q);
  const count = q.trim() ? parts.filter((p) => p.hit).length : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari di dalam teks…" className="pl-8" />
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {q.trim() ? `${count} kecocokan` : `${text.length.toLocaleString("id-ID")} karakter`}
        </span>
      </div>
      <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-muted/30 p-4 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap">
        {parts.map((p, i) =>
          p.hit ? (
            <mark key={i} className="rounded-sm bg-warn/40 text-foreground">
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          ),
        )}
      </pre>
    </div>
  );
}

function highlight(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const q = query.trim();
  if (!q) return [{ text, hit: false }];
  const out: Array<{ text: string; hit: boolean }> = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(needle, i);
    if (idx === -1) {
      out.push({ text: text.slice(i), hit: false });
      break;
    }
    if (idx > i) out.push({ text: text.slice(i, idx), hit: false });
    out.push({ text: text.slice(idx, idx + needle.length), hit: true });
    i = idx + needle.length;
  }
  return out;
}
