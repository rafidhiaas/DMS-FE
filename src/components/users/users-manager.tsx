"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Search, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { canManageUser } from "@/lib/api/users";
import { ROLE_LABELS } from "@/lib/constants";
import { ROLE_BADGE_CLASS, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ManagedUser, Role } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { DeleteConfirmDialog } from "@/components/folders/folder-dialogs";
import { EmptyState } from "@/components/empty-state";

const ROLES: Role[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "AUDITOR", "EMPLOYEE"];

/** Manajemen pengguna (pola Users & Groups Paperless, disederhanakan ke peran RBAC). */
export function UsersManager({ actorRole, actorId }: { actorRole: Role; actorId: string }) {
  const [query, setQuery] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const users = useUsers(query, includeInactive);
  const update = useUpdateUser();
  const remove = useDeleteUser();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  const assignableRoles = ROLES.filter((r) => canManageUser(actorRole, r));

  function toggleActive(u: ManagedUser) {
    update.mutate(
      { id: u.id, active: !u.active },
      {
        onSuccess: () => toast.success(u.active ? `${u.name} dinonaktifkan.` : `${u.name} diaktifkan kembali.`),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Pengguna ${deleteTarget.email} dihapus.`);
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            placeholder="Cari nama atau email…"
            aria-label="Cari pengguna"
            className="pl-8"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(Boolean(v))} />
          Tampilkan nonaktif
        </label>
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          {users.data ? `${users.data.length} pengguna` : ""}
        </span>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="size-4" />
          Pengguna baru
        </Button>
      </div>

      {users.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : users.isError ? (
        <EmptyState tone="destructive" title="Gagal memuat pengguna" description="Coba muat ulang halaman." />
      ) : (users.data?.length ?? 0) === 0 ? (
        <EmptyState title="Tidak ada pengguna yang cocok" description="Coba kata kunci nama atau email yang lain." />
      ) : (
        <div className="rounded-lg border border-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Peran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login terakhir</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="w-32 pr-3 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data!.map((u) => {
                const manageable = canManageUser(actorRole, u.role);
                const self = u.id === actorId;
                return (
                  <TableRow key={u.id} className={cn(!u.active && "opacity-60")}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-medium text-primary">
                          {initials(u.name)}
                        </div>
                        <span className="font-medium">
                          {u.name}
                          {self && <span className="ml-2 font-mono text-[10.5px] text-muted-foreground">(Anda)</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ROLE_BADGE_CLASS[u.role]}>
                        {ROLE_LABELS[u.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={u.active ? "border-ok/60 text-ok" : "border-rule text-muted-foreground"}>
                        {u.active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_login_at ? formatDateTime(u.last_login_at) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="pr-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label="Ubah pengguna"
                          disabled={!manageable}
                          onClick={() => setEditTarget(u)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8"
                          aria-label={u.active ? "Nonaktifkan" : "Aktifkan"}
                          title={u.active ? "Nonaktifkan" : "Aktifkan"}
                          disabled={!manageable || self || update.isPending}
                          onClick={() => toggleActive(u)}
                        >
                          {u.active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label="Hapus pengguna"
                          disabled={!manageable || self}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <UserFormDialog
        key={`create-${createOpen}`}
        open={createOpen}
        onOpenChange={setCreateOpen}
        roles={assignableRoles}
      />
      <UserFormDialog
        key={`edit-${editTarget?.id ?? "none"}`}
        open={editTarget !== null}
        onOpenChange={(v) => !v && setEditTarget(null)}
        roles={assignableRoles}
        initial={editTarget ?? undefined}
        lockRole={editTarget?.id === actorId}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus pengguna?"
        description={`Akun ${deleteTarget?.email ?? ""} akan dihapus. Untuk mencabut akses sementara, gunakan Nonaktifkan.`}
        onConfirm={handleDelete}
        pending={remove.isPending}
      />
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  roles,
  initial,
  lockRole = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: Role[];
  initial?: ManagedUser;
  /** Akun sendiri: peran tidak bisa diubah. */
  lockRole?: boolean;
}) {
  const create = useCreateUser();
  const update = useUpdateUser();
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? (roles.includes("EMPLOYEE") ? "EMPLOYEE" : roles[0]));
  const [password, setPassword] = useState("");
  const pending = create.isPending || update.isPending;
  const roleItems = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  function submit() {
    const opts = { onError: (e: Error) => toast.error(e.message) };
    if (initial) {
      update.mutate(
        { id: initial.id, name: name.trim(), ...(lockRole ? {} : { role }) },
        { ...opts, onSuccess: () => { toast.success("Pengguna diperbarui."); onOpenChange(false); } },
      );
    } else {
      create.mutate(
        { name: name.trim(), email: email.trim(), role, password },
        { ...opts, onSuccess: (u) => { toast.success(`Pengguna ${u.email} ditambahkan.`); onOpenChange(false); } },
      );
    }
  }

  // Backend: nama min. 2 karakter, kata sandi min. 8 karakter.
  const valid =
    name.trim().length >= 2 && (initial ? true : email.trim().length > 0 && password.length >= 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Ubah pengguna" : "Pengguna baru"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Ubah nama atau peran. Email tidak dapat diubah."
              : "Akun dibuat aktif. Berikan kata sandi awal ini kepada pengguna."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nama</Label>
            <Input id="user-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              disabled={!!initial}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.com"
            />
          </div>
          {!initial && (
            <div className="space-y-2">
              <Label htmlFor="user-password">Kata sandi awal</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Peran</Label>
            <Select value={role} items={roleItems} onValueChange={(v) => setRole(v as Role)} disabled={lockRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockRole && <p className="text-xs text-muted-foreground">Peran akun sendiri tidak dapat diubah.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!valid || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {initial ? "Simpan" : "Tambahkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
