"use client";

import { useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { ALLOWED_EXTENSIONS, formatBytes, type AllowedExtension } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* `items` agar trigger Select menampilkan ".pdf", bukan "pdf" (Base UI). */
const EXTENSION_ITEMS = ALLOWED_EXTENSIONS.map((ext) => ({ value: ext, label: `.${ext}` }));

/** Ringkasan berkas dari <input type=file> / drag-and-drop untuk mengisi form unggah. */
export function describeFile(file: File): {
  title: string;
  extension: AllowedExtension | null;
  size_bytes: number;
} {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const supported = (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  return {
    title: file.name.replace(/\.[^.]+$/, ""),
    extension: supported ? (ext as AllowedExtension) : null,
    size_bytes: file.size || 102400,
  };
}

/* ------------------------------ Buat Folder ------------------------------ */

export function CreateFolderDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string) => void;
  pending: boolean;
}) {
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat Folder Baru</DialogTitle>
          <DialogDescription>
            Beri nama folder untuk mengelompokkan dokumen Anda.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="folder-name">Nama Folder</Label>
          <Input
            id="folder-name"
            value={name}
            autoFocus
            placeholder="mis. Kontrak 2026"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={!name.trim() || pending} onClick={() => onSubmit(name.trim())}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Buat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------- Buat Dokumen ------------------------------ */

export function CreateDocumentDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  initialFile = null,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: { title: string; extension: string; size_bytes: number; file?: File }) => void;
  pending: boolean;
  /** Berkas hasil drag-and-drop — mengisi form saat dialog dibuka (dialog di-remount via key). */
  initialFile?: File | null;
}) {
  const initial = initialFile ? describeFile(initialFile) : null;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [extension, setExtension] = useState<AllowedExtension>(initial?.extension ?? "pdf");
  const [sizeBytes, setSizeBytes] = useState<number>(initial?.size_bytes ?? 102400);
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const fileName = file?.name ?? null;

  function applyFile(next: File) {
    const info = describeFile(next);
    if (info.extension) setExtension(info.extension);
    setSizeBytes(info.size_bytes);
    setFile(next);
    if (!title.trim()) setTitle(info.title);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  }

  /* Zona pilih berkas di dalam dialog juga menerima drop langsung. */
  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }

  const valid = title.trim().length > 0 && sizeBytes > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unggah Dokumen</DialogTitle>
          <DialogDescription>
            Pilih berkas lalu tentukan judulnya. Versi awal (v1) dibuat otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <UploadCloud className="size-6" />
            <span className={fileName ? "font-medium text-foreground" : undefined}>
              {fileName ?? "Klik untuk memilih berkas, atau seret ke sini"}
            </span>
            <span className="text-xs">
              {ALLOWED_EXTENSIONS.join(", ")} · maks 500MB
            </span>
            <input type="file" className="hidden" onChange={handleFile} />
          </label>

          <div className="space-y-2">
            <Label htmlFor="doc-title">Judul Dokumen</Label>
            <Input
              id="doc-title"
              value={title}
              placeholder="mis. Laporan Tahunan"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ekstensi</Label>
              <Select
                value={extension}
                items={EXTENSION_ITEMS}
                onValueChange={(v) => setExtension(v as AllowedExtension)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_EXTENSIONS.map((ext) => (
                    <SelectItem key={ext} value={ext}>
                      .{ext}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ukuran</Label>
              <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                {formatBytes(sizeBytes)}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={!valid || pending}
            onClick={() =>
              onSubmit({ title: title.trim(), extension, size_bytes: sizeBytes, file: file ?? undefined })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Unggah
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- Rename ---------------------------------- */

export function RenameDialog({
  open,
  onOpenChange,
  title,
  label,
  initialValue,
  onSubmit,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  label: string;
  initialValue: string;
  onSubmit: (value: string) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-input">{label}</Label>
          <Input
            id="rename-input"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={!value.trim() || pending} onClick={() => onSubmit(value.trim())}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Konfirmasi Hapus ---------------------------- */

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
