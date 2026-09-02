"use client";

import { useState } from "react";
import { Info, Search, UsersRound } from "lucide-react";
import { useUsers } from "@/hooks/use-users";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_BADGE_CLASS: Record<Role, string> = {
  SUPER_ADMIN: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  COMPANY_ADMIN: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  AUDITOR: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  EMPLOYEE: "bg-muted text-muted-foreground",
};

/** Daftar pengguna (read-only — lihat banner gap backend di bawah). */
export function UsersTable() {
  const [query, setQuery] = useState("");
  const users = useUsers(query);

  return (
    <div className="space-y-4">
      {/* Banner gap backend */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Backend belum menyediakan endpoint manajemen user (list, ubah peran,
          nonaktifkan akun). Data di bawah adalah <b>mock</b> dan bersifat
          read-only sampai endpoint <code>/api/users</code> tersedia.
        </p>
      </div>

      {/* Pencarian */}
      <div className="relative max-w-sm">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          placeholder="Cari nama atau email..."
          className="pl-8"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Tabel */}
      {users.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : (users.data?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <UsersRound className="size-10 text-muted-foreground" />
          <p className="font-medium">Tidak ada pengguna yang cocok</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
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
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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
