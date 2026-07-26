"use client";

import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Folder } from "@/types";

/** Breadcrumb dinamis: Root › Folder A › Folder B (current). */
export function Breadcrumbs({ path }: { path: Folder[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
      <Link
        href="/folders"
        className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-accent hover:text-foreground"
      >
        <Home className="size-4" />
        <span>Root</span>
      </Link>

      {path.map((folder, i) => {
        const isLast = i === path.length - 1;
        return (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="size-4 shrink-0" />
            <Link
              href={`/folders/${folder.id}`}
              className={cn(
                "truncate rounded px-1.5 py-1 hover:bg-accent hover:text-foreground",
                isLast && "font-medium text-foreground",
              )}
            >
              {folder.name}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
