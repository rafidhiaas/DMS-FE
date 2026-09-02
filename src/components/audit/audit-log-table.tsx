"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileDown,
  Loader2,
  ScrollText,
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useActivityLogs } from "@/hooks/use-audit-logs";
import { fetchActivityLogsCsv } from "@/lib/api/activity-logs";
import { triggerBrowserDownload } from "@/lib/download";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, actionMeta, AUDIT_ACTIONS } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import type { ActivityLog, Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAGE_SIZE = 10;
const ALL_ACTIONS = "__ALL__";

const columnHelper = createColumnHelper<ActivityLog>();

const columns = [
  columnHelper.accessor("created_at", {
    header: "Waktu",
    cell: (info) => (
      <span className="whitespace-nowrap text-muted-foreground">
        {formatDateTime(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("user", {
    header: "Pengguna",
    cell: (info) => {
      const user = info.getValue();
      if (!user) return <span className="text-muted-foreground">-</span>;
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {user.email} · {ROLE_LABELS[user.role]}
          </p>
        </div>
      );
    },
  }),
  columnHelper.accessor("action", {
    header: "Aksi",
    cell: (info) => {
      const meta = actionMeta(info.getValue());
      return (
        <Badge variant="secondary" className={meta.className}>
          {meta.label}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("details", {
    header: "Detail",
    cell: (info) => (
      <span className="block max-w-96 truncate" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("ip_address", {
    header: "IP",
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">{info.getValue()}</span>
    ),
  }),
];

/** Tabel Audit Log — filter per action, pagination server-style, export CSV. */
export function AuditLogTable({ role }: { role: Role }) {
  const [action, setAction] = useState<string>(ALL_ACTIONS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const logsQuery = useActivityLogs({
    action: action === ALL_ACTIONS ? undefined : action,
    page,
    limit: PAGE_SIZE,
  });

  const logs = useMemo(() => logsQuery.data?.logs ?? [], [logsQuery.data]);
  const pagination = logsQuery.data?.pagination;
  const canExport = role === "SUPER_ADMIN" || role === "AUDITOR";

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: pagination?.total ?? 0,
  });

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await fetchActivityLogsCsv();
      triggerBrowserDownload(
        new Blob([csv], { type: "text/csv" }),
        `activity-log-${Date.now()}.csv`,
      );
      toast.success("Audit log diekspor ke CSV.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Gagal mengekspor audit log."));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: filter + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select
          value={action}
          onValueChange={(v) => {
            setAction(v as string);
            setPage(1);
          }}
        >
          <SelectTrigger className="min-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ACTIONS}>Semua aksi</SelectItem>
            {AUDIT_ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {actionMeta(a).label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canExport && (
          <Button variant="outline" disabled={exporting} onClick={handleExport}>
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            Ekspor CSV
          </Button>
        )}
      </div>

      {/* Tabel */}
      {logsQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : logsQuery.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          Gagal memuat audit log. Coba muat ulang halaman.
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <ScrollText className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">Tidak ada aktivitas</p>
            <p className="text-sm text-muted-foreground">
              Tidak ada log yang cocok dengan filter saat ini.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header, i) => (
                    <TableHead
                      key={header.id}
                      className={i === 0 ? "pl-4" : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, i) => (
                    <TableCell key={cell.id} className={i === 0 ? "pl-4" : undefined}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {pagination.total} aktivitas · halaman {pagination.page} dari{" "}
            {pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1 || logsQuery.isFetching}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1 || logsQuery.isFetching}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= pagination.totalPages || logsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= pagination.totalPages || logsQuery.isFetching}
              onClick={() => setPage(pagination.totalPages)}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
