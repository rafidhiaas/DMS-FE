"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Download, ExternalLink, Inbox, Lock } from "lucide-react";
import { useSharedWithMe } from "@/hooks/use-shares";
import { downloadDocument } from "@/lib/download";
import { formatDate, ACCESS_LEVEL_META, STATUS_META } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon } from "@/components/folders/file-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Daftar dokumen yang dibagikan kepada user yang sedang login. */
export function SharedWithMe() {
  const shared = useSharedWithMe();

  if (shared.isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (shared.isError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
        Gagal memuat dokumen yang dibagikan. Coba muat ulang halaman.
      </div>
    );
  }

  const items = shared.data ?? [];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Inbox className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Belum ada dokumen dibagikan</p>
          <p className="text-sm text-muted-foreground">
            Dokumen yang dibagikan rekan kerja akan muncul di sini.
          </p>
        </div>
      </div>
    );
  }

  async function handleDownload(item: (typeof items)[number]) {
    try {
      await downloadDocument({
        id: item.document.id,
        title: item.document.title,
        extension: item.document.extension,
        current_version: item.document.current_version,
      });
      toast.success("Berkas simulasi diunduh (menunggu integrasi S3).");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal mengunduh."));
    }
  }

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Dokumen</TableHead>
            <TableHead>Akses Saya</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dibagikan</TableHead>
            <TableHead className="pr-4 text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const access = ACCESS_LEVEL_META[item.access_level];
            const status = STATUS_META[item.document.status];
            const canDownload = item.access_level !== "VIEWER";
            return (
              <TableRow key={item.id}>
                <TableCell className="pl-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileIcon extension={item.document.extension} />
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-64 truncate font-medium">{item.document.title}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="uppercase">{item.document.extension}</span> · v
                        {item.document.current_version}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={access.className} title={access.description}>
                    {access.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(item.created_at)}
                </TableCell>
                <TableCell className="pr-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/documents/${item.document.id}`}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-8")}
                      title="Buka detail"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                    {canDownload ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        title="Unduh berkas"
                        onClick={() => handleDownload(item)}
                      >
                        <Download className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 cursor-not-allowed opacity-50"
                        title="Akses Viewer — unduhan dinonaktifkan"
                        disabled
                      >
                        <Lock className="size-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
