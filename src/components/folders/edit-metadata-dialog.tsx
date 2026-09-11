"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { useTags, useDocumentTypes, useCorrespondents } from "@/hooks/use-meta";
import { useUpdateDocumentMeta, useBulkUpdateMeta } from "@/hooks/use-documents";
import type { CustomFieldValue, DocumentItem, MetaItem } from "@/types";
import { CustomFieldInputs } from "@/components/metadata/custom-field-inputs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { TagChip } from "@/components/metadata/tag-chip";
import { MetaFormDialog } from "@/components/metadata/metadata-manager";

const NONE = "__none__";

/** Select nullable (Base UI butuh `items` agar label tampil di trigger). */
export function NullableSelect({
  value,
  onChange,
  items,
  placeholder,
  extra,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  items: Array<Pick<MetaItem, "id" | "name">>;
  placeholder: string;
  /** Opsi tambahan di atas "— Tidak ada —" (dipakai bulk: "Biarkan"). */
  extra?: { value: string; label: string };
}) {
  const options = [
    ...(extra ? [extra] : []),
    { value: NONE, label: placeholder },
    ...items.map((it) => ({ value: it.id, label: it.name })),
  ];
  return (
    <Select value={value ?? NONE} items={options} onValueChange={(v) => onChange(v === NONE ? null : (v as string))}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Daftar checkbox tag + tombol buat tag baru inline. */
export function TagPicker({
  selected,
  onToggle,
  label = "Tag",
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  label?: string;
}) {
  const tags = useTags();
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Tag baru
        </Button>
      </div>
      {tags.isLoading ? (
        <Skeleton className="h-16 rounded-md" />
      ) : (tags.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada tag. Buat lewat tombol di atas.</p>
      ) : (
        <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
          {tags.data!.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={selected.has(t.id)} onCheckedChange={() => onToggle(t.id)} />
              <TagChip tag={t} />
            </label>
          ))}
        </div>
      )}
      <MetaFormDialog
        key={`inline-tag-${createOpen}`}
        kind="tag"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(item) => onToggle(item.id)}
      />
    </div>
  );
}

/** Dialog ubah metadata satu dokumen (tag, tipe, pihak, tanggal dokumen, nomor arsip, deskripsi). */
export function EditMetadataDialog({
  doc,
  open,
  onOpenChange,
}: {
  doc: DocumentItem;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const types = useDocumentTypes(open);
  const correspondents = useCorrespondents(open);
  const update = useUpdateDocumentMeta();

  const [tagIds, setTagIds] = useState<Set<string>>(() => new Set(doc.tag_ids ?? []));
  const [typeId, setTypeId] = useState<string | null>(doc.document_type_id ?? null);
  const [corrId, setCorrId] = useState<string | null>(doc.correspondent_id ?? null);
  const [date, setDate] = useState(doc.document_date?.slice(0, 10) ?? "");
  const [asn, setAsn] = useState(doc.asn != null ? String(doc.asn) : "");
  const [description, setDescription] = useState(doc.description ?? "");
  const [customValues, setCustomValues] = useState<Record<string, CustomFieldValue>>(() => ({ ...(doc.custom_fields ?? {}) }));

  function toggleTag(id: string) {
    setTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    const asnNumber = asn.trim() === "" ? null : Number(asn);
    if (asnNumber !== null && (!Number.isInteger(asnNumber) || asnNumber < 0)) {
      toast.error("Nomor arsip harus bilangan bulat positif.");
      return;
    }
    update.mutate(
      {
        id: doc.id,
        patch: {
          tag_ids: Array.from(tagIds),
          document_type_id: typeId,
          correspondent_id: corrId,
          document_date: date ? new Date(date).toISOString() : null,
          asn: asnNumber,
          description: description.trim() || null,
          custom_fields: customValues,
        },
      },
      {
        onSuccess: () => {
          toast.success("Metadata diperbarui.");
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah metadata</DialogTitle>
          <DialogDescription>Menandai “{doc.title}” agar mudah difilter dan dicari.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TagPicker selected={tagIds} onToggle={toggleTag} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe dokumen</Label>
              <NullableSelect value={typeId} onChange={setTypeId} items={types.data ?? []} placeholder="— Tidak ada —" />
            </div>
            <div className="space-y-2">
              <Label>Pihak</Label>
              <NullableSelect
                value={corrId}
                onChange={setCorrId}
                items={correspondents.data ?? []}
                placeholder="— Tidak ada —"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-date">Tanggal dokumen</Label>
              <Input id="doc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-asn">Nomor arsip (ASN)</Label>
              <Input
                id="doc-asn"
                type="number"
                min={0}
                inputMode="numeric"
                value={asn}
                placeholder="mis. 1004"
                onChange={(e) => setAsn(e.target.value)}
              />
            </div>
          </div>

          <CustomFieldInputs
            values={customValues}
            onChange={(fieldId, value) => setCustomValues((prev) => ({ ...prev, [fieldId]: value }))}
          />

          <div className="space-y-2">
            <Label htmlFor="doc-desc">Deskripsi</Label>
            <Textarea
              id="doc-desc"
              value={description}
              placeholder="Ringkasan isi dokumen (ikut dicari di pencarian global)."
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={update.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const KEEP = "__keep__";

/** Dialog ubah metadata massal (pola bulk edit Paperless): tambah/lepas tag, set tipe & pihak. */
export function BulkMetadataDialog({
  documents,
  open,
  onOpenChange,
  onDone,
}: {
  documents: DocumentItem[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const types = useDocumentTypes(open);
  const correspondents = useCorrespondents(open);
  const tags = useTags(open);
  const bulk = useBulkUpdateMeta();

  const [addTags, setAddTags] = useState<Set<string>>(() => new Set());
  const [removeTags, setRemoveTags] = useState<Set<string>>(() => new Set());
  const [typeId, setTypeId] = useState<string | null>(KEEP);
  const [corrId, setCorrId] = useState<string | null>(KEEP);

  const presentTagIds = new Set(documents.flatMap((d) => d.tag_ids ?? []));
  const presentTags = (tags.data ?? []).filter((t) => presentTagIds.has(t.id));

  function toggle(set: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    set((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const nothing =
    addTags.size === 0 && removeTags.size === 0 && typeId === KEEP && corrId === KEEP;

  function submit() {
    bulk.mutate(
      {
        ids: documents.map((d) => d.id),
        patch: {
          add_tag_ids: Array.from(addTags),
          remove_tag_ids: Array.from(removeTags),
          ...(typeId !== KEEP ? { document_type_id: typeId } : {}),
          ...(corrId !== KEEP ? { correspondent_id: corrId } : {}),
        },
      },
      {
        onSuccess: (n) => {
          toast.success(`Metadata ${n} dokumen diperbarui.`);
          onOpenChange(false);
          onDone();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ubah metadata {documents.length} dokumen</DialogTitle>
          <DialogDescription>Hanya bagian yang Anda ubah yang diterapkan; sisanya dibiarkan.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <TagPicker label="Tambahkan tag" selected={addTags} onToggle={(id) => toggle(setAddTags, id)} />

          {presentTags.length > 0 && (
            <div className="space-y-2">
              <Label>Lepas tag</Label>
              <div className="flex flex-wrap gap-2 rounded-md border p-2">
                {presentTags.map((t) => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                    <Checkbox checked={removeTags.has(t.id)} onCheckedChange={() => toggle(setRemoveTags, t.id)} />
                    <TagChip tag={t} />
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipe dokumen</Label>
              <NullableSelect
                value={typeId}
                onChange={setTypeId}
                items={types.data ?? []}
                placeholder="— Kosongkan —"
                extra={{ value: KEEP, label: "Biarkan seperti semula" }}
              />
            </div>
            <div className="space-y-2">
              <Label>Pihak</Label>
              <NullableSelect
                value={corrId}
                onChange={setCorrId}
                items={correspondents.data ?? []}
                placeholder="— Kosongkan —"
                extra={{ value: KEEP, label: "Biarkan seperti semula" }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>
            Batal
          </Button>
          <Button onClick={submit} disabled={nothing || bulk.isPending}>
            {bulk.isPending && <Loader2 className="size-4 animate-spin" />}
            Terapkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
