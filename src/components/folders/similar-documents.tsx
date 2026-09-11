"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAllDocuments } from "@/hooks/use-documents";
import { STATUS_META } from "@/lib/format";
import type { DocumentItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileIcon } from "@/components/folders/file-icon";
import { DocumentTags } from "@/components/metadata/tag-chip";

/** Skor kemiripan sederhana: tag sama, tipe sama, pihak sama, folder sama, kata judul sama. */
function similarity(a: DocumentItem, b: DocumentItem): number {
  let s = 0;
  const tagsA = new Set(a.tag_ids ?? []);
  for (const t of b.tag_ids ?? []) if (tagsA.has(t)) s += 3;
  if (a.document_type_id && a.document_type_id === b.document_type_id) s += 2;
  if (a.correspondent_id && a.correspondent_id === b.correspondent_id) s += 2;
  if (a.folder_id === b.folder_id) s += 1;
  const words = new Set(a.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  for (const w of b.title.toLowerCase().split(/\W+/)) if (words.has(w)) s += 1;
  return s;
}

/** Panel "Mirip dengan ini" (pola More like this Paperless) di kolom kanan detail dokumen. */
export function SimilarDocuments({ doc }: { doc: DocumentItem }) {
  const all = useAllDocuments();
  const items = (all.data ?? [])
    .filter((d) => d.id !== doc.id)
    .map((d) => ({ d, s: similarity(doc, d) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 5);

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-muted-foreground" />
          Mirip dengan ini
        </CardTitle>
      </CardHeader>
      <CardContent className="ledger -mt-2">
        {items.map(({ d }) => (
          <Link
            key={d.id}
            href={`/documents/${d.id}`}
            className="-mx-2 flex items-center gap-3 rounded-sm px-2 py-2.5 transition-colors hover:bg-accent/60"
          >
            <FileIcon extension={d.extension} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{d.title}</span>
              <DocumentTags tagIds={d.tag_ids} max={2} className="mt-0.5" />
            </span>
            <Badge variant="secondary" className={STATUS_META[d.status].className}>
              {STATUS_META[d.status].label}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
