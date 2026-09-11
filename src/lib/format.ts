import type { AccessLevel, DocumentStatus, Role } from "@/types";

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

/** Warna stempel peran — memakai token tema, bukan warna Tailwind mentah. */
export const ROLE_BADGE_CLASS: Record<Role, string> = {
  SUPER_ADMIN: "border-destructive/50 text-destructive",
  COMPANY_ADMIN: "border-primary/60 text-primary",
  AUDITOR: "border-info/60 text-info",
  EMPLOYEE: "border-rule text-muted-foreground",
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
  // Tautan publik — action pilihan FE, belum ada di backend (lihat backend-gaps).
  "CREATE_SHARE_LINK",
  "REVOKE_SHARE_LINK",
  "ACCESS_SHARE_LINK",
  // Sampah, pindah dokumen, catatan — FE mock (backend belum mendukung).
  "TRASH_DOCUMENT",
  "RESTORE_DOCUMENT",
  "MOVE_DOCUMENT",
  "ADD_NOTE",
  "DELETE_NOTE",
  "UPDATE_DOCUMENT_META",
  "CREATE_META",
  "UPDATE_META",
  "DELETE_META",
  "SUBMIT_REVIEW",
  "WITHDRAW_REVIEW",
  "APPROVE_DOCUMENT",
  "REJECT_DOCUMENT",
  "ARCHIVE_DOCUMENT",
  "UNARCHIVE_DOCUMENT",
  "CREATE_USER",
  "UPDATE_USER",
  "DEACTIVATE_USER",
  "ACTIVATE_USER",
  "DELETE_USER",
  "WORKFLOW_APPLIED",
  "UPDATE_WORKFLOW",
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
  CREATE_SHARE_LINK: "Buat Tautan Publik",
  REVOKE_SHARE_LINK: "Cabut Tautan Publik",
  ACCESS_SHARE_LINK: "Akses via Tautan",
  TRASH_DOCUMENT: "Ke Sampah",
  RESTORE_DOCUMENT: "Pulihkan Dokumen",
  MOVE_DOCUMENT: "Pindah Dokumen",
  ADD_NOTE: "Tambah Catatan",
  DELETE_NOTE: "Hapus Catatan",
  UPDATE_DOCUMENT_META: "Ubah Metadata",
  CREATE_META: "Buat Metadata",
  UPDATE_META: "Ubah Metadata Master",
  DELETE_META: "Hapus Metadata Master",
  SUBMIT_REVIEW: "Ajukan Review",
  WITHDRAW_REVIEW: "Tarik Pengajuan",
  APPROVE_DOCUMENT: "Setujui Dokumen",
  REJECT_DOCUMENT: "Tolak Dokumen",
  ARCHIVE_DOCUMENT: "Arsipkan Dokumen",
  UNARCHIVE_DOCUMENT: "Buka Arsip",
  CREATE_USER: "Tambah Pengguna",
  UPDATE_USER: "Ubah Pengguna",
  DEACTIVATE_USER: "Nonaktifkan Pengguna",
  ACTIVATE_USER: "Aktifkan Pengguna",
  DELETE_USER: "Hapus Pengguna",
  WORKFLOW_APPLIED: "Otomatisasi Berjalan",
  UPDATE_WORKFLOW: "Ubah Otomatisasi",
};

/** Label + warna badge per action audit (fallback aman untuk action tak dikenal). */
export function actionMeta(action: string): { label: string; className: string } {
  const label = ACTION_LABELS[action as AuditAction] ?? action;
  if (
    action === "DELETE_FOLDER" ||
    action === "DELETE_DOCUMENT" ||
    action === "REVOKE_SHARE" ||
    action === "REVOKE_SHARE_LINK" ||
    action === "DELETE_NOTE" ||
    action === "DELETE_META" ||
    action === "REJECT_DOCUMENT" ||
    action === "DELETE_USER" ||
    action === "DEACTIVATE_USER" ||
    action === "LOGIN_FAILED"
  ) {
    return { label, className: "border-destructive/50 text-destructive" };
  }
  if (action === "APPROVE_DOCUMENT") {
    return { label, className: "border-ok/60 text-ok" };
  }
  if (action === "SUBMIT_REVIEW") {
    return { label, className: "border-warn/60 text-warn" };
  }
  if (action === "TRASH_DOCUMENT") {
    return { label, className: "border-warn/60 text-warn" };
  }
  if (action === "RESTORE_DOCUMENT" || action === "ADD_NOTE") {
    return { label, className: "border-ok/60 text-ok" };
  }
  if (action.startsWith("SHARE") || action.endsWith("SHARE_LINK") || action === "UPDATE_SHARE_ACCESS") {
    return { label, className: "border-primary/60 text-primary" };
  }
  if (action.startsWith("CREATE") || action === "UPLOAD_VERSION") {
    return { label, className: "border-ok/60 text-ok" };
  }
  if (action === "LOGIN" || action === "LOGOUT") {
    return { label, className: "border-info/60 text-info" };
  }
  return { label, className: "border-rule text-muted-foreground" };
}

/** Pilihan masa berlaku tautan publik (hari; null = tanpa batas). */
export const SHARE_LINK_EXPIRY_OPTIONS: ReadonlyArray<{ value: string; label: string; days: number | null }> = [
  { value: "1", label: "1 hari", days: 1 },
  { value: "7", label: "7 hari", days: 7 },
  { value: "30", label: "30 hari", days: 30 },
  { value: "never", label: "Tanpa batas", days: null },
];

/** Sisa waktu tautan dalam bahasa manusia; null jika tanpa batas. */
export function formatRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "Tanpa batas";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Kedaluwarsa";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 24) return `${hours} jam lagi`;
  const days = Math.ceil(hours / 24);
  return `${days} hari lagi`;
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
  "md",
] as const;

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
