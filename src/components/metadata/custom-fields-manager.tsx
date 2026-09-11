"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useCustomFields, useCreateCustomField, useUpdateCustomField, useDeleteCustomField } from "@/hooks/use-custom-fields";
import { CUSTOM_FIELD_TYPE_LABELS } from "@/lib/api/custom-fields";
import { formatDate } from "@/lib/format";
import type { CustomField, CustomFieldType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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

const TYPES = Object.keys(CUSTOM_FIELD_TYPE_LABELS) as CustomFieldType[];
const TYPE_ITEMS = TYPES.map((t) => ({ value: t, label: CUSTOM_FIELD_TYPE_LABELS[t] }));

/** Tab "Bidang khusus" di halaman Metadata. */
export function CustomFieldsManager({ canWrite }: { canWrite: boolean }) {
  const fields = useCustomFields();
  const remove = useDeleteCustomField();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CustomField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomField | null>(null);

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Bidang "${deleteTarget.name}" dihapus.`);
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Bidang tambahan bertipe (teks, angka, tanggal, ya/tidak, pilihan, uang, tautan) yang bisa diisi di setiap dokumen.
        </p>
        {canWrite && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Bidang baru
          </Button>
        )}
      </div>

      {fields.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-11 rounded-lg" />
          ))}
        </div>
      ) : fields.isError ? (
        <EmptyState tone="destructive" title="Gagal memuat bidang khusus" />
      ) : (fields.data ?? []).length === 0 ? (
        <EmptyState title="Belum ada bidang khusus" description={canWrite ? "Buat bidang pertama, mis. “Nilai kontrak” bertipe Uang." : undefined} />
      ) : (
        <div className="rounded-lg border border-rule bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Pilihan</TableHead>
                <TableHead className="text-right">Dokumen</TableHead>
                <TableHead>Dibuat</TableHead>
                {canWrite && <TableHead className="w-28 pr-3 text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.data!.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="pl-4 font-medium">{f.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="border-rule text-muted-foreground">
                      {CUSTOM_FIELD_TYPE_LABELS[f.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">
                    {f.type === "select" ? (f.options ?? []).join(", ") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{f.document_count ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(f.created_at)}</TableCell>
                  {canWrite && (
                    <TableCell className="pr-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="size-8" aria-label="Ubah" onClick={() => setEditTarget(f)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          aria-label="Hapus"
                          onClick={() => setDeleteTarget(f)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomFieldFormDialog key={`create-${createOpen}`} open={createOpen} onOpenChange={setCreateOpen} />
      <CustomFieldFormDialog
        key={`edit-${editTarget?.id ?? "none"}`}
        open={editTarget !== null}
        onOpenChange={(v) => !v && setEditTarget(null)}
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus bidang khusus?"
        description={`Nilai "${deleteTarget?.name ?? ""}" akan dihapus dari ${deleteTarget?.document_count ?? 0} dokumen.`}
        onConfirm={handleDelete}
        pending={remove.isPending}
      />
    </div>
  );
}

function CustomFieldFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CustomField;
}) {
  const create = useCreateCustomField();
  const update = useUpdateCustomField();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<CustomFieldType>(initial?.type ?? "text");
  const [options, setOptions] = useState((initial?.options ?? []).join("\n"));
  const pending = create.isPending || update.isPending;

  function submit() {
    const input = {
      name: name.trim(),
      type,
      options: type === "select" ? options.split("\n").map((o) => o.trim()).filter(Boolean) : undefined,
    };
    if (type === "select" && (input.options ?? []).length === 0) {
      toast.error("Bidang bertipe Pilihan butuh minimal satu opsi.");
      return;
    }
    const opts = { onError: (e: Error) => toast.error(e.message) };
    if (initial) {
      update.mutate({ id: initial.id, ...input }, { ...opts, onSuccess: () => { toast.success("Bidang diperbarui."); onOpenChange(false); } });
    } else {
      create.mutate(input, { ...opts, onSuccess: (f) => { toast.success(`Bidang "${f.name}" dibuat.`); onOpenChange(false); } });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial ? "Ubah bidang khusus" : "Bidang khusus baru"}</DialogTitle>
          <DialogDescription>
            {initial ? "Mengubah tipe tidak mengonversi nilai yang sudah ada." : "Bidang akan tersedia di dialog metadata setiap dokumen."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-name">Nama</Label>
            <Input id="cf-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Nilai kontrak" />
          </div>
          <div className="space-y-2">
            <Label>Tipe</Label>
            <Select value={type} items={TYPE_ITEMS} onValueChange={(v) => setType(v as CustomFieldType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {CUSTOM_FIELD_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "select" && (
            <div className="space-y-2">
              <Label htmlFor="cf-options">Opsi (satu per baris)</Label>
              <Textarea id="cf-options" value={options} onChange={(e) => setOptions(e.target.value)} placeholder={"Keuangan\nLegal\nSDM"} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {initial ? "Simpan" : "Buat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
