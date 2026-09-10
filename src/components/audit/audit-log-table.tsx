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
} from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowData,
} from "@tanstack/react-table";
import { useActivityLogs } from "@/hooks/use-audit-logs";
import { fetchActivityLogsCsv } from "@/lib/api/activity-logs";
import { triggerBrowserDownload } from "@/lib/download";
import { getApiErrorMessage } from "@/lib/api/client";
import { formatDateTime, actionMeta, AUDIT_ACTIONS } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ActivityLog, Role } from "@/types";
import { EmptyState } from "@/components/empty-state";

/* Kolom bisa membawa className (mis. sembunyikan di layar sempit). */
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}
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

/* `items` agar trigger Select menampilkan label, bukan nilai mentah (Base UI). */
const ACTION_ITEMS = [
  { value: ALL_ACTIONS, label: "Semua aksi" },
  ...AUDIT_ACTIONS.map((a) => ({ value: a, label: actionMeta(a).label })),
];

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
      <span className="block max-w-72 truncate xl:max-w-96" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("ip_address", {
    header: "IP",
    meta: { className: "hidden 2xl:table-cell" },
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
          items={ACTION_ITEMS}
          onValueChange={(v) => {
            setAction(v as string);
            setPage(1);
          }}
        >
          <SelectTrigger className="min-w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_ITEMS.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
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
        <EmptyState
          tone="destructive"
          title="Gagal memuat audit log"
          description="Coba muat ulang halaman."
        />
      ) : logs.length === 0 ? (
        <EmptyState
          title="Tidak ada aktivitas"
          description="Tidak ada log yang cocok dengan filter saat ini."
        />
      ) : (
        <div className="rounded-lg border border-rule bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header, i) => (
                    <TableHead
                      key={header.id}
                      className={cn(i === 0 && "pl-4", header.column.columnDef.meta?.className)}
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
                    <TableCell
                      key={cell.id}
                      className={cn(i === 0 && "pl-4", cell.column.columnDef.meta?.className)}
                    >
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
