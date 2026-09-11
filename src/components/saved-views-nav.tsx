"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bookmark } from "lucide-react";
import { useSavedViews, savedViewHref } from "@/lib/saved-views";
import { cn } from "@/lib/utils";

/** Daftar Tampilan Tersimpan di sidebar (desktop & mobile) — hanya yang ditandai showInSidebar. */
export function SavedViewsNav({ onNavigate }: { onNavigate?: () => void }) {
  const { views } = useSavedViews();
  const pathname = usePathname();
  const params = useSearchParams();
  const activeId = params.get("view");

  const items = views.filter((v) => v.showInSidebar);
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="eyebrow mb-2 px-3 text-sidebar-muted/80">Tampilan tersimpan</p>
      <nav aria-label="Tampilan tersimpan" className="flex flex-col gap-0.5">
        {items.map((v) => {
          const active =
            activeId === v.id && pathname === (v.folderId === "all" ? "/documents" : `/folders/${v.folderId}`);
          return (
            <Link
              key={v.id}
              href={savedViewHref(v)}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              title={`${v.folderName}`}
              className={cn(
                "group flex items-center gap-3 rounded-sm px-3 py-2 text-[14px] transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Bookmark
                className={cn("size-3.5 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-muted/70")}
              />
              <span className={cn("truncate", active && "font-medium")}>{v.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
