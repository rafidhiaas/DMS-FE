"use client";

import { X } from "lucide-react";
import { useTags } from "@/hooks/use-meta";
import { cn } from "@/lib/utils";
import type { MetaItem } from "@/types";

/** Chip tag berwarna (warna hex dari data; latar transparan agar cocok terang & gelap). */
export function TagChip({
  tag,
  size = "sm",
  onRemove,
  className,
}: {
  tag: Pick<MetaItem, "name" | "color">;
  size?: "xs" | "sm";
  onRemove?: () => void;
  className?: string;
}) {
  const color = tag.color ?? "#64748b";
  return (
    <span
      style={{ borderColor: `${color}80`, color, backgroundColor: `${color}1a` }}
      className={cn(
        "inline-flex max-w-40 items-center gap-1 rounded-sm border font-mono uppercase tracking-[0.06em] whitespace-nowrap",
        size === "xs" ? "px-1 py-px text-[9.5px]" : "px-1.5 py-0.5 text-[10.5px]",
        className,
      )}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Lepas tag ${tag.name}`}
          className="opacity-70 hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

/** Deretan chip tag sebuah dokumen dari daftar id (tag di-resolve lewat cache query). */
export function DocumentTags({
  tagIds,
  max = 3,
  size = "xs",
  className,
}: {
  tagIds: string[] | undefined;
  max?: number;
  size?: "xs" | "sm";
  className?: string;
}) {
  const tags = useTags();
  const ids = tagIds ?? [];
  if (ids.length === 0 || !tags.data) return null;
  const resolved = ids
    .map((id) => tags.data!.find((t) => t.id === id))
    .filter((t): t is MetaItem => Boolean(t));
  if (resolved.length === 0) return null;
  const shown = resolved.slice(0, max);
  const rest = resolved.length - shown.length;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {shown.map((t) => (
        <TagChip key={t.id} tag={t} size={size} />
      ))}
      {rest > 0 && (
        <span className="font-mono text-[10px] text-muted-foreground" title={resolved.slice(max).map((t) => t.name).join(", ")}>
          +{rest}
        </span>
      )}
    </span>
  );
}
