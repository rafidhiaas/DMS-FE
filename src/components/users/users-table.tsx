"use client";

import { useState } from "react";
import { Info, Search } from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import { ROLE_LABELS } from "@/lib/constants";
import { ROLE_BADGE_CLASS } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Daftar pengguna (read-only — lihat catatan gap backend di bawah). */
export function UsersTable() {
  const [query, setQuery] = useState("");
  const users = useUsers(query);

  return (
    <div className="space-y-4">
      {/* Catatan gap backend — warna token `warn`, bukan amber mentah. */}
      <div className="flex items-start gap-3 rounded-md border border-warn/50 bg-warn/10 p-4 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-warn" />
        <p className="text-foreground/90">
          Backend belum menyediakan endpoint manajemen user (list, ubah peran, nonaktifkan
          akun). Data di bawah adalah <b>mock</b> dan bersifat read-only sampai endpoint{" "}
          <code className="font-mono text-[12px]">/api/users</code> tersedia.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Cari nama atau email…"
          aria-label="Cari pengguna"
          className="pl-8"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {users.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : users.isError ? (
        <EmptyState
          tone="destructive"
          title="Gagal memuat pengguna"
          description="Coba muat ulang halaman."
        />
      ) : (users.data?.length ?? 0) === 0 ? (
        <EmptyState
          title="Tidak ada pengguna yang cocok"
          description="Coba kata kunci nama atau email yang lain."
        />
      ) : (
        <div className="rounded-lg border border-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data!.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-medium text-primary">
                        {initials(u.name)}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={ROLE_BADGE_CLASS[u.role]}>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
