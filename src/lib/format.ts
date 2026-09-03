import type { AccessLevel, DocumentStatus } from "@/types";

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
  DRAFT: { label: "Draft", className: "border-rule text-muted-foreground" },
  PENDING_REVIEW: {
    label: "Menunggu Review",
    className: "border-warn/60 text-warn",
  },
  APPROVED: {
    label: "Disetujui",
    className: "border-ok/60 text-ok",
  },
  ARCHIVED: {
    label: "Diarsipkan",
    className: "border-rule text-muted-foreground",
  },
};

/** Label & deskripsi untuk level akses berbagi dokumen. */
export const ACCESS_LEVEL_META: Record<
  AccessLevel,
  { label: string; description: string; className: string }
> = {
  VIEWER: {
    label: "Viewer",
    description: "Hanya pratinjau — tidak bisa mengunduh berkas.",
    className: "border-rule text-muted-foreground",
  },
  DOWNLOADER: {
    label: "Downloader",
    description: "Bisa melihat dan mengunduh berkas asli.",
    className: "border-info/60 text-info",
  },
  EDITOR: {
    label: "Editor",
    description: "Bisa mengunggah versi baru dan mengubah judul.",
    className: "border-primary/60 text-primary",
  },
};

/**
 * Action audit log — disinkronkan dengan pemanggilan logActivity di backend.
 * Dipakai untuk filter dropdown & pewarnaan badge.
 */
export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGIN_FAILED",
  "LOGOUT",
  "CREATE_FOLDER",
  "RENAME_FOLDER",
  "MOVE_FOLDER",
  "DELETE_FOLDER",
  "CREATE_DOCUMENT",
  "RENAME_DOCUMENT",
  "UPLOAD_VERSION",
  "DELETE_DOCUMENT",
  "DOWNLOAD_DOCUMENT",
  "SHARE_DOCUMENT",
  "UPDATE_SHARE_ACCESS",
  "REVOKE_SHARE",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

const ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN: "Login",
  LOGIN_FAILED: "Login Gagal",
  LOGOUT: "Logout",
  CREATE_FOLDER: "Buat Folder",
  RENAME_FOLDER: "Ganti Nama Folder",
  MOVE_FOLDER: "Pindah Folder",
  DELETE_FOLDER: "Hapus Folder",
  CREATE_DOCUMENT: "Unggah Dokumen",
  RENAME_DOCUMENT: "Ganti Judul Dokumen",
  UPLOAD_VERSION: "Unggah Versi",
  DELETE_DOCUMENT: "Hapus Dokumen",
  DOWNLOAD_DOCUMENT: "Unduh Dokumen",
  SHARE_DOCUMENT: "Bagikan Dokumen",
  UPDATE_SHARE_ACCESS: "Ubah Akses",
  REVOKE_SHARE: "Cabut Akses",
};

/** Label + warna badge per action audit (fallback aman untuk action tak dikenal). */
export function actionMeta(action: string): { label: string; className: string } {
  const label = ACTION_LABELS[action as AuditAction] ?? action;
  if (action === "DELETE_FOLDER" || action === "DELETE_DOCUMENT" || action === "REVOKE_SHARE" || action === "LOGIN_FAILED") {
    return { label, className: "border-destructive/50 text-destructive" };
  }
  if (action.startsWith("CREATE") || action === "UPLOAD_VERSION") {
    return { label, className: "border-ok/60 text-ok" };
  }
  if (action.startsWith("SHARE") || action === "UPDATE_SHARE_ACCESS") {
    return { label, className: "border-primary/60 text-primary" };
  }
  if (action === "LOGIN" || action === "LOGOUT") {
    return { label, className: "border-info/60 text-info" };
  }
  return { label, className: "border-rule text-muted-foreground" };
}

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
