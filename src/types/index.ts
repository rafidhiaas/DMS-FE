/** Peran pengguna — disinkronkan dengan enum SystemRole di backend Prisma. */
export type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "AUDITOR" | "EMPLOYEE";

/** Status siklus hidup dokumen. */
export type DocumentStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "ARCHIVED";

/** Level akses berbagi dokumen. */
export type AccessLevel = "VIEWER" | "DOWNLOADER" | "EDITOR";

/** Data pengguna yang login (tersimpan di cookie dms_user). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Folder {
  id: string;
  name: string;
  owner_id: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  extension: string;
  /** BigInt diserialisasi sebagai string oleh backend. */
  size_bytes: string;
  folder_id: string;
  current_version: number;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  /** Terisi bila dokumen berada di Sampah (soft delete — FE mock; backend belum punya). */
  deleted_at?: string | null;
  /* ---- Metadata ala Paperless (FE mock; backend belum punya kolomnya) ---- */
  tag_ids?: string[];
  document_type_id?: string | null;
  correspondent_id?: string | null;
  /** Tanggal dokumen (bukan tanggal unggah), ISO. */
  document_date?: string | null;
  /** Nomor arsip (Archive Serial Number). */
  asn?: number | null;
  description?: string | null;
}

/** Jenis metadata yang dikelola di halaman Metadata. */
export type MetaKind = "tag" | "type" | "correspondent";

/** Item metadata generik (Tag punya `color`). */
export interface MetaItem {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  /** Jumlah dokumen yang memakainya (diisi saat list). */
  document_count?: number;
}
export type Tag = MetaItem & { color: string };
export type DocumentType = MetaItem;
export type Correspondent = MetaItem;

/** Patch metadata satu dokumen. */
export interface DocumentMetaPatch {
  tag_ids?: string[];
  document_type_id?: string | null;
  correspondent_id?: string | null;
  document_date?: string | null;
  asn?: number | null;
  description?: string | null;
}

/** Patch metadata massal — hanya field yang diberikan yang diterapkan. */
export interface BulkMetaPatch {
  add_tag_ids?: string[];
  remove_tag_ids?: string[];
  document_type_id?: string | null;
  correspondent_id?: string | null;
}

/** Entri halaman Sampah: dokumen + nama folder asal + jadwal pembersihan otomatis. */
export interface TrashItem extends DocumentItem {
  folder_name: string;
  purge_at: string;
}

/** Catatan bebas pada dokumen (tab "Catatan" — meniru Notes Paperless). */
export interface DocumentNote {
  id: string;
  document_id: string;
  user_id: string;
  body: string;
  created_at: string;
  user?: UserSummary;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  s3_file_key: string;
  uploaded_by: string;
  changelog: string | null;
  created_at: string;
}

export interface DocumentDetail extends DocumentItem {
  versions: DocumentVersion[];
  folder: Folder;
}

/** Ringkasan pengguna pada relasi (share/audit). */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface DocumentShare {
  id: string;
  document_id: string;
  user_id: string;
  access_level: AccessLevel;
  created_at: string;
  user?: UserSummary;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
  user?: UserSummary;
  /**
   * Dokumen yang terkait aksi ini (untuk tab "Riwayat" di detail dokumen).
   * Kolom ini belum ada di backend — FE mock mengisinya, backend mengembalikan undefined.
   */
  document_id?: string | null;
}

/** Ringkasan dokumen pada relasi share (bentuk respons GET /shares/shared-with-me). */
export interface DocumentSummary {
  id: string;
  title: string;
  extension: string;
  status: DocumentStatus;
  current_version: number;
  updated_at: string;
}

/** Satu entri "Dibagikan ke Saya" — share + ringkasan dokumennya. */
export interface SharedWithMeItem extends DocumentShare {
  document: DocumentSummary;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Respons GET /activity-logs (paginated). */
export interface ActivityLogPage {
  logs: ActivityLog[];
  pagination: Pagination;
}

export interface FolderContents {
  folderId: string | null;
  subFolders: Folder[];
  documents: DocumentItem[];
}

/** Akses yang bisa diberikan lewat tautan publik (tanpa login). */
export type ShareLinkAccess = "VIEWER" | "DOWNLOADER";

/**
 * Tautan publik berbatas waktu ke satu dokumen — sesuai spec ShareLink.
 * Backend belum menyediakan endpoint-nya; FE memakai mock store dulu.
 */
export interface ShareLink {
  id: string;
  document_id: string;
  token: string;
  access: ShareLinkAccess;
  /** null = tanpa batas waktu. */
  expires_at: string | null;
  created_by: string;
  created_at: string;
  /** Berapa kali tautan dibuka (untuk audit). */
  access_count: number;
}

/** Data yang ditampilkan halaman publik /share/[token]. */
export interface PublicShareView {
  link: ShareLink;
  document: DocumentSummary & { size_bytes: string; folder_name: string };
}

/** Hasil pencarian global (folder + dokumen). */
export type SearchResult =
  | { kind: "folder"; id: string; name: string; path: string }
  | {
      kind: "document";
      id: string;
      title: string;
      extension: string;
      status: DocumentStatus;
      folder_name: string;
      updated_at: string;
    };
