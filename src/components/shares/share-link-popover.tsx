"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Link2, Loader2, Plus, Trash2 } from "lucide-react";
import { useShareLinks, useCreateShareLink, useRevokeShareLink } from "@/hooks/use-share-links";
import { shareLinkUrl } from "@/lib/api/share-links";
import { isExpired } from "@/lib/mocks/share-link-store";
import { formatRemaining, SHARE_LINK_EXPIRY_OPTIONS } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ShareLink, ShareLinkAccess } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* `items` membuat Select.Value menampilkan label, bukan nilai mentah (Base UI). */
const EXPIRY_ITEMS = SHARE_LINK_EXPIRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));
const ACCESS_ITEMS: Array<{ value: ShareLinkAccess; label: string }> = [
  { value: "VIEWER", label: "Lihat saja" },
  { value: "DOWNLOADER", label: "Lihat & unduh" },
];

/**
 * Popover "Tautan Publik" — meniru panel Share Links di Paperless-ngx:
 * pilih masa berlaku + level akses, buat, salin, cabut. Kecil dan kontekstual,
 * bukan dialog besar, karena hanya butuh dua pilihan.
 */
export function ShareLinkPopover({ documentId }: { documentId: string }) {
  const [open, setOpen] = useState(false);
  const [expiry, setExpiry] = useState("7");
  const [access, setAccess] = useState<ShareLinkAccess>("VIEWER");

  const links = useShareLinks(documentId, open);
  const create = useCreateShareLink(documentId);
  const revoke = useRevokeShareLink(documentId);

  function handleCreate() {
    const opt = SHARE_LINK_EXPIRY_OPTIONS.find((o) => o.value === expiry);
    create.mutate(
      { access, expires_in_days: opt?.days ?? 7 },
      {
        onSuccess: async (link) => {
          const copied = await copyToClipboard(shareLinkUrl(link.token));
          toast.success(copied ? "Tautan dibuat dan disalin ke clipboard." : "Tautan dibuat.");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  const activeCount = (links.data ?? []).filter((l) => !isExpired(l)).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn(buttonVariants({ variant: "outline" }))}>
        <Link2 className="size-4" />
        Tautan Publik
        {activeCount > 0 && (
          <span className="ml-1 rounded-sm bg-primary/10 px-1.5 font-mono text-[10.5px] text-primary">
            {activeCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96 space-y-4">
        <div>
          <PopoverTitle>Tautan publik</PopoverTitle>
          <PopoverDescription>
            Siapa pun yang memegang tautan bisa membuka dokumen tanpa login sampai masa berlaku habis.
          </PopoverDescription>
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Berlaku</Label>
            <Select
              value={expiry}
              onValueChange={(v) => setExpiry(v as string)}
              items={EXPIRY_ITEMS}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHARE_LINK_EXPIRY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Akses</Label>
            <Select
              value={access}
              onValueChange={(v) => setAccess(v as ShareLinkAccess)}
              items={ACCESS_ITEMS}
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_ITEMS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Buat
          </Button>
        </div>

        <div className="space-y-2">
          <p className="eyebrow">Tautan yang ada</p>
          {links.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 rounded-md" />
              <Skeleton className="h-10 rounded-md" />
            </div>
          ) : links.isError ? (
            <p className="text-xs text-destructive">{links.error.message}</p>
          ) : (links.data?.length ?? 0) === 0 ? (
            <p className="border-y border-rule py-3 text-xs text-muted-foreground">
              Belum ada tautan publik untuk dokumen ini.
            </p>
          ) : (
            <div className="ledger max-h-56 overflow-y-auto">
              {links.data!.map((link) => (
                <ShareLinkRow
                  key={link.id}
                  link={link}
                  pending={revoke.isPending}
                  onRevoke={() =>
                    revoke.mutate(link.id, {
                      onSuccess: () => toast.success("Tautan dicabut."),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ShareLinkRow({
  link,
  pending,
  onRevoke,
}: {
  link: ShareLink;
  pending: boolean;
  onRevoke: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const expired = isExpired(link);

  async function handleCopy() {
    const ok = await copyToClipboard(shareLinkUrl(link.token));
    if (!ok) return toast.error("Gagal menyalin. Salin manual dari kolom tautan.");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={cn("flex items-center gap-2 py-2", expired && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11.5px]">/share/{link.token}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Badge
            variant="secondary"
            className={link.access === "DOWNLOADER" ? "border-info/60 text-info" : undefined}
          >
            {link.access === "DOWNLOADER" ? "Unduh" : "Lihat"}
          </Badge>
          <span className={cn(expired && "text-destructive")}>{formatRemaining(link.expires_at)}</span>
          {link.access_count > 0 && <span>· dibuka {link.access_count}×</span>}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Salin tautan"
        disabled={expired}
        onClick={handleCopy}
      >
        {copied ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        title="Cabut tautan"
        disabled={pending}
        onClick={onRevoke}
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
