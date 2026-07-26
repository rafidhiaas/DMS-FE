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
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FolderContents {
  folderId: string | null;
  subFolders: Folder[];
  documents: DocumentItem[];
}
