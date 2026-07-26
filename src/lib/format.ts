import type { DocumentStatus } from "@/types";

/** Ubah ukuran byte → format terbaca (KB, MB, GB). */
export function formatBytes(bytes: number | string, decimals = 1): string {
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!n || n <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return `${parseFloat((n / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** Format tanggal ke Bahasa Indonesia. */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format tanggal + waktu. */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Label & warna badge untuk status dokumen. */
export const STATUS_META: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  PENDING_REVIEW: {
    label: "Menunggu Review",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  APPROVED: {
    label: "Disetujui",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  ARCHIVED: {
    label: "Diarsipkan",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
};

/** Ekstensi berkas yang didukung backend (whitelist). */
export const ALLOWED_EXTENSIONS = [
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "png",
  "jpg",
  "jpeg",
  "txt",
  "csv",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
