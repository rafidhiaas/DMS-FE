"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, Workflow, Zap } from "lucide-react";
import { useWorkflows, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow, useMoveWorkflow } from "@/hooks/use-workflows";
import { useAllFolders } from "@/hooks/use-folders";
import { useTags, useDocumentTypes, useCorrespondents } from "@/hooks/use-meta";
import { ALLOWED_EXTENSIONS, STATUS_META, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DocumentStatus, WorkflowRule, WorkflowRuleInput, WorkflowTrigger } from "@/types";
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
import { DeleteConfirmDialog } from "@/components/folders/folder-dialogs";
import { NullableSelect, TagPicker } from "@/components/folders/edit-metadata-dialog";
import { TagChip } from "@/components/metadata/tag-chip";
import { EmptyState } from "@/components/empty-state";

const TRIGGER_LABEL: Record<WorkflowTrigger, string> = {
  upload: "Saat dokumen diunggah",
  status_change: "Saat status berubah",
};
const TRIGGER_ITEMS = (Object.keys(TRIGGER_LABEL) as WorkflowTrigger[]).map((t) => ({ value: t, label: TRIGGER_LABEL[t] }));
const STATUSES = Object.keys(STATUS_META) as DocumentStatus[];
const ANY = "__any__";

/** Halaman Otomatisasi: daftar aturan berurutan, aktif/nonaktif, jumlah eksekusi, dan editor aturan. */
export function WorkflowManager() {
  const rules = useWorkflows();
  const update = useUpdateWorkflow();
  const remove = useDeleteWorkflow();
  const move = useMoveWorkflow();
  const tags = useTags();
  const types = useDocumentTypes();
  const correspondents = useCorrespondents();
  const folders = useAllFolders();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WorkflowRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowRule | null>(null);

  const list = rules.data ?? [];
  const nameOf = (items: Array<{ id: string; name: string }> | undefined, id: string | null | undefined) =>
    items?.find((i) => i.id === id)?.name;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-prose text-sm text-muted-foreground">
          Aturan dijalankan berurutan dari atas. Cocokkan folder, format, atau kata di judul, lalu tambahkan tag,
          tetapkan tipe/pihak, atau (saat unggah) langsung ubah status.
        </p>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Aturan baru
        </Button>
      </div>

      {rules.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : rules.isError ? (
        <EmptyState tone="destructive" title="Gagal memuat aturan" />
      ) : list.length === 0 ? (
        <EmptyState title="Belum ada aturan otomatisasi" description="Contoh: setiap unggahan ke folder Legal berformat PDF diberi tag Kontrak." />
      ) : (
        <ol className="space-y-2">
          {list.map((r, idx) => (
            <li
              key={r.id}
              className={cn("flex flex-wrap items-start gap-4 rounded-lg border bg-card p-4", !r.enabled && "opacity-60")}
            >
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <Button size="icon" variant="ghost" className="size-6" aria-label="Naikkan" disabled={idx === 0 || move.isPending} onClick={() => move.mutate({ id: r.id, direction: "up" })}>
                  <ArrowUp className="size-3.5" />
                </Button>
                <span className="font-mono text-[11px] text-muted-foreground">{r.order}</span>
                <Button size="icon" variant="ghost" className="size-6" aria-label="Turunkan" disabled={idx === list.length - 1 || move.isPending} onClick={() => move.mutate({ id: r.id, direction: "down" })}>
                  <ArrowDown className="size-3.5" />
                </Button>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Zap className={cn("size-4", r.enabled ? "text-primary" : "text-muted-foreground")} />
                  <span className="font-medium">{r.name}</span>
                  <Badge variant="secondary" className="border-rule text-muted-foreground">
                    {TRIGGER_LABEL[r.trigger]}
                    {r.trigger === "status_change" && r.trigger_status ? ` → ${STATUS_META[r.trigger_status].label}` : ""}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground/80">Jika</span>{" "}
                  {[
                    r.match_folder_id ? `folder “${nameOf(folders.data, r.match_folder_id) ?? "?"}”` : "folder apa pun",
                    r.match_extensions.length ? `format ${r.match_extensions.map((e) => e.toUpperCase()).join("/")}` : null,
                    r.match_title_contains ? `judul mengandung “${r.match_title_contains}”` : null,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  {" · "}
                  <span className="text-foreground/80">maka</span>{" "}
                  <span className="inline-flex flex-wrap items-center gap-1 align-middle">
                    {r.assign_tag_ids.map((id) => {
                      const t = tags.data?.find((x) => x.id === id);
                      return t ? <TagChip key={id} tag={t} size="xs" /> : null;
                    })}
                    {r.assign_type_id && <span>tipe {nameOf(types.data, r.assign_type_id) ?? "?"}</span>}
                    {r.assign_correspondent_id && <span>pihak {nameOf(correspondents.data, r.assign_correspondent_id) ?? "?"}</span>}
                    {r.assign_status && <span>status {STATUS_META[r.assign_status].label}</span>}
                    {!r.assign_tag_ids.length && !r.assign_type_id && !r.assign_correspondent_id && !r.assign_status && (
                      <span className="italic">tidak ada aksi</span>
                    )}
                  </span>
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Dijalankan {r.run_count}× {r.last_run_at ? `· terakhir ${formatDateTime(r.last_run_at)}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <label className="mr-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Checkbox
                    checked={r.enabled}
                    onCheckedChange={(v) =>
                      update.mutate({ id: r.id, enabled: Boolean(v) }, { onError: (e) => toast.error(e.message) })
                    }
                  />
                  Aktif
                </label>
                <Button size="icon" variant="ghost" className="size-8" aria-label="Ubah" onClick={() => setEditTarget(r)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Hapus" onClick={() => setDeleteTarget(r)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <WorkflowFormDialog key={`create-${createOpen}`} open={createOpen} onOpenChange={setCreateOpen} />
      <WorkflowFormDialog
        key={`edit-${editTarget?.id ?? "none"}`}
        open={editTarget !== null}
        onOpenChange={(v) => !v && setEditTarget(null)}
        initial={editTarget ?? undefined}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Hapus aturan?"
        description={`Aturan "${deleteTarget?.name ?? ""}" tidak akan dijalankan lagi. Dokumen yang sudah diproses tidak berubah.`}
        onConfirm={() =>
          deleteTarget &&
          remove.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success("Aturan dihapus.");
              setDeleteTarget(null);
            },
            onError: (e) => toast.error(e.message),
          })
        }
        pending={remove.isPending}
      />
    </div>
  );
}

function WorkflowFormDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: WorkflowRule;
}) {
  const create = useCreateWorkflow();
  const update = useUpdateWorkflow();
  const folders = useAllFolders(open);
  const types = useDocumentTypes(open);
  const correspondents = useCorrespondents(open);

  const [name, setName] = useState(initial?.name ?? "");
  const [trigger, setTrigger] = useState<WorkflowTrigger>(initial?.trigger ?? "upload");
  const [triggerStatus, setTriggerStatus] = useState<DocumentStatus | null>(initial?.trigger_status ?? null);
  const [folderId, setFolderId] = useState<string | null>(initial?.match_folder_id ?? null);
  const [extensions, setExtensions] = useState<string[]>(initial?.match_extensions ?? []);
  const [titleContains, setTitleContains] = useState(initial?.match_title_contains ?? "");
  const [tagIds, setTagIds] = useState<Set<string>>(() => new Set(initial?.assign_tag_ids ?? []));
  const [typeId, setTypeId] = useState<string | null>(initial?.assign_type_id ?? null);
  const [corrId, setCorrId] = useState<string | null>(initial?.assign_correspondent_id ?? null);
  const [status, setStatus] = useState<DocumentStatus | null>(initial?.assign_status ?? null);
  const pending = create.isPending || update.isPending;

  const statusItems = [{ value: ANY, label: "— Status apa pun —" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))];
  const assignStatusItems = [{ value: ANY, label: "— Biarkan (Draft) —" }, ...STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label }))];

  function submit() {
    const input: WorkflowRuleInput = {
      name: name.trim(),
      enabled: initial?.enabled ?? true,
      trigger,
      trigger_status: trigger === "status_change" ? triggerStatus : null,
      match_folder_id: folderId,
      match_extensions: extensions,
      match_title_contains: titleContains.trim(),
      assign_tag_ids: Array.from(tagIds),
      assign_type_id: typeId,
      assign_correspondent_id: corrId,
      assign_status: trigger === "upload" ? status : null,
    };
    const opts = { onError: (e: Error) => toast.error(e.message) };
    if (initial) {
      update.mutate({ id: initial.id, ...input }, { ...opts, onSuccess: () => { toast.success("Aturan diperbarui."); onOpenChange(false); } });
    } else {
      create.mutate(input, { ...opts, onSuccess: (r) => { toast.success(`Aturan "${r.name}" dibuat.`); onOpenChange(false); } });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="size-4" />
            {initial ? "Ubah aturan" : "Aturan otomatisasi baru"}
          </DialogTitle>
          <DialogDescription>Semua kondisi harus terpenuhi; kondisi kosong berarti cocok untuk semua.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="wf-name">Nama aturan</Label>
            <Input id="wf-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Kontrak di folder Legal" />
          </div>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="eyebrow px-1">Pemicu</legend>
            <Select value={trigger} items={TRIGGER_ITEMS} onValueChange={(v) => setTrigger(v as WorkflowTrigger)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_ITEMS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trigger === "status_change" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Hanya bila status baru</Label>
                <Select value={triggerStatus ?? ANY} items={statusItems} onValueChange={(v) => setTriggerStatus(v === ANY ? null : (v as DocumentStatus))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusItems.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="eyebrow px-1">Kondisi</legend>
            <div className="space-y-1.5">
              <Label className="text-xs">Folder</Label>
              <NullableSelect value={folderId} onChange={setFolderId} items={folders.data ?? []} placeholder="— Folder apa pun —" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Format berkas</Label>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_EXTENSIONS.map((ext) => {
                  const on = extensions.includes(ext);
                  return (
                    <button
                      key={ext}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setExtensions((prev) => (on ? prev.filter((e) => e !== ext) : [...prev, ext]))}
                      className={cn(
                        "rounded-md border px-2 py-1 font-mono text-[11px] uppercase transition-colors",
                        on ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {ext}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wf-title" className="text-xs">Judul mengandung</Label>
              <Input id="wf-title" value={titleContains} onChange={(e) => setTitleContains(e.target.value)} placeholder="mis. kontrak" />
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border p-3">
            <legend className="eyebrow px-1">Aksi</legend>
            <TagPicker label="Tambahkan tag" selected={tagIds} onToggle={(id) => setTagIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Tetapkan tipe dokumen</Label>
                <NullableSelect value={typeId} onChange={setTypeId} items={types.data ?? []} placeholder="— Biarkan —" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tetapkan pihak</Label>
                <NullableSelect value={corrId} onChange={setCorrId} items={correspondents.data ?? []} placeholder="— Biarkan —" />
              </div>
            </div>
            {trigger === "upload" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Status awal</Label>
                <Select value={status ?? ANY} items={assignStatusItems} onValueChange={(v) => setStatus(v === ANY ? null : (v as DocumentStatus))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignStatusItems.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!name.trim() || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {initial ? "Simpan" : "Buat aturan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
