"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { useCreateDocument } from "@/hooks/use-documents";
import { describeFile } from "@/components/folders/folder-dialogs";
import { asDuplicateError } from "@/lib/api/documents";
import { MoveDialog } from "@/components/folders/move-dialog";
import { cn } from "@/lib/utils";

/**
 * "Drop anywhere" di dashboard (pola Paperless): jatuhkan berkas di mana saja
 * atau klik tombol unggah → pilih folder tujuan → semua berkas diunggah.
 * Membungkus isi dashboard; tombol pemicu diberikan lewat render prop.
 */
export function QuickUpload({
  enabled,
  children,
}: {
  enabled: boolean;
  /** Isi dashboard; menerima `openPicker` untuk tombol "Unggah dokumen". */
  children: (openPicker: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const createDocument = useCreateDocument();
  // Dibuka lewat id (bukan ref) agar tidak ada akses ref saat render — lint React Compiler.
  const inputId = useId();

  const [files, setFiles] = useState<File[]>([]);
  const [dragDepth, setDragDepth] = useState(0);
  const [busy, setBusy] = useState(false);

  const pickerOpen = files.length > 0;

  function hasFiles(e: React.DragEvent) {
    return Array.from(e.dataTransfer.types).includes("Files");
  }

  function acceptFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    if (!enabled) {
      toast.error("Peran Anda hanya-baca; tidak dapat mengunggah dokumen.");
      return;
    }
    setFiles(arr);
  }

  async function upload(folderId: string | null) {
    if (!folderId) return;
    setBusy(true);
    let ok = 0;
    const skipped: string[] = [];
    const duplicates: string[] = [];
    for (const file of files) {
      const info = describeFile(file);
      if (!info.extension) {
        skipped.push(file.name);
        continue;
      }
      try {
        await createDocument.mutateAsync({
          title: info.title,
          extension: info.extension,
          size_bytes: info.size_bytes,
          folder_id: folderId,
          file,
        });
        ok += 1;
      } catch (err) {
        const dup = asDuplicateError(err);
        if (dup) duplicates.push(`${file.name} (sudah ada: ${dup.existing.title})`);
        else toast.error(`${file.name}: ${err instanceof Error ? err.message : "gagal diunggah"}`);
      }
    }
    setBusy(false);
    setFiles([]);
    if (duplicates.length > 0) toast.warning(`${duplicates.length} berkas duplikat dilewati: ${duplicates.join("; ")}`);
    if (skipped.length > 0) {
      toast.warning(`${skipped.length} berkas dilewati (ekstensi tidak didukung): ${skipped.join(", ")}`);
    }
    if (ok > 0) {
      toast.success(`${ok} dokumen diunggah.`, {
        action: { label: "Buka folder", onClick: () => router.push(`/folders/${folderId}`) },
      });
    }
  }

  const dragging = dragDepth > 0;

  function openPicker() {
    document.getElementById(inputId)?.click();
  }

  return (
    <div
      className="relative"
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth((d) => d + 1);
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        setDragDepth((d) => Math.max(0, d - 1));
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = enabled ? "copy" : "none";
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth(0);
        acceptFiles(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-background/85 text-center backdrop-blur-[2px]",
            enabled ? "border-primary text-primary" : "border-destructive/60 text-destructive",
          )}
        >
          <UploadCloud className="size-8" />
          <p className="font-medium">
            {enabled ? "Lepaskan berkas — pilih folder tujuan setelahnya" : "Peran Anda hanya-baca"}
          </p>
        </div>
      )}

      <input
        id={inputId}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {children(openPicker)}

      <MoveDialog
        key={`qu-${pickerOpen}`}
        open={pickerOpen}
        onOpenChange={(v) => !v && !busy && setFiles([])}
        title={files.length === 1 ? `Unggah “${files[0].name}”` : `Unggah ${files.length} berkas`}
        description="Pilih folder tempat dokumen akan disimpan. Judul diambil dari nama berkas."
        currentFolderId={null}
        allowRoot={false}
        submitLabel="Unggah ke sini"
        onSubmit={upload}
        pending={busy}
      />
    </div>
  );
}
