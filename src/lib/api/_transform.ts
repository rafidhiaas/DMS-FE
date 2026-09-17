/**
 * Helper transform BE response (camelCase) → FE shape (snake_case).
 * BE return: { success, data, pagination? }
 * FE expect: shape snake_case langsung
 */
import type { AccessLevel, DocumentStatus, Role } from "@/types";

// ============ Bentuk mentah dari BE (camelCase) ============
export interface BeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface BeFolder {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  parentFolderId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Hanya ada pada respons tree GET /folders. */
  subFolders?: BeFolder[];
}

export interface BeVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  s3FileKey: string;
  fileSize?: string | number | null;
  mimeType?: string | null;
  uploadedBy: string;
  changelog?: string | null;
  checksum?: string | null;
  originalName?: string | null;
  createdAt?: string;
}

export interface BeShare {
  id: string;
  documentId: string;
  userId: string;
  accessLevel: AccessLevel;
  sharedBy?: string;
  expiresAt?: string | null;
  createdAt?: string;
  user?: BeUser | null;
  document?: {
    id: string;
    title: string;
    extension: string;
    status: DocumentStatus;
    currentVersion: number;
    updatedAt?: string;
  } | null;
}

export interface BeMetaRef {
  id: string;
  name: string;
  color?: string;
}

export interface BeDocument {
  id: string;
  title: string;
  description?: string | null;
  extension: string;
  sizeBytes?: string | number | null;
  folderId: string;
  uploadedBy: string;
  currentVersion?: number;
  status?: DocumentStatus;
  isPublic?: boolean;
  deletedAt?: string | null;
  documentTypeId?: string | null;
  correspondentId?: string | null;
  documentDate?: string | null;
  /** Kolom string unik di BE; FE memakainya sebagai angka. */
  asn?: string | number | null;
  customFields?: Record<string, string | number | boolean | null>;
  documentTags?: { tag?: BeMetaRef | null }[];
  folder?: BeFolder | null;
  uploadedByUser?: BeUser | null;
  versions?: BeVersion[];
  documentType?: BeMetaRef | null;
  correspondent?: BeMetaRef | null;
  shares?: BeShare[];
  userAccess?: {
    isOwner: boolean;
    accessLevel: AccessLevel | null;
    canEdit?: boolean;
    canDownload?: boolean;
  } | null;
  /** Nama aturan otomatisasi yang baru saja diterapkan (unggah / ubah status). */
  appliedRules?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// ============ Generic Unwrap ============
export function unwrap<T>(response: unknown): T {
  if (response && typeof response === "object" && "data" in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

// ============ User ============
export function mapUserSummary(u: BeUser | null | undefined) {
  if (!u) return undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  };
}

// ============ Folder ============
export function mapFolder(f: BeFolder | null | undefined) {
  if (!f) return null;
  return {
    id: f.id,
    name: f.name,
    description: f.description ?? null,
    owner_id: f.ownerId,
    parent_folder_id: f.parentFolderId ?? null,
    created_at: f.createdAt ?? "",
    updated_at: f.updatedAt ?? "",
  };
}

// ============ Version ============
export function mapVersion(v: BeVersion | null | undefined) {
  if (!v) return null;
  return {
    id: v.id,
    document_id: v.documentId,
    version_number: v.versionNumber,
    s3_file_key: v.s3FileKey,
    file_size: v.fileSize != null ? String(v.fileSize) : null,
    mime_type: v.mimeType ?? null,
    uploaded_by: v.uploadedBy,
    changelog: v.changelog ?? "",
    checksum: v.checksum ?? null,
    original_name: v.originalName ?? null,
    created_at: v.createdAt ?? "",
  };
}

// ============ Document Share ============
export function mapShare(s: BeShare | null | undefined) {
  if (!s) return null;
  return {
    id: s.id,
    document_id: s.documentId,
    user_id: s.userId,
    access_level: s.accessLevel,
    shared_by: s.sharedBy,
    expires_at: s.expiresAt ?? null,
    created_at: s.createdAt ?? "",
    user: mapUserSummary(s.user),
    document: s.document
      ? {
          id: s.document.id,
          title: s.document.title,
          extension: s.document.extension,
          status: s.document.status,
          current_version: s.document.currentVersion,
          updated_at: s.document.updatedAt ?? "",
        }
      : undefined,
  };
}

// ============ Document ============
export function mapDocument(d: BeDocument | null | undefined) {
  if (!d) return null;
  const tags = (d.documentTags ?? [])
    .map((dt) => dt.tag)
    .filter((t): t is BeMetaRef => Boolean(t));
  return {
    id: d.id,
    title: d.title,
    description: d.description ?? "",
    extension: d.extension,
    size_bytes: String(d.sizeBytes ?? "0"),
    folder_id: d.folderId,
    uploaded_by: d.uploadedBy,
    current_version: d.currentVersion ?? 1,
    status: d.status ?? ("DRAFT" as DocumentStatus),
    is_public: d.isPublic ?? false,
    deleted_at: d.deletedAt ?? null,

    // Metadata
    document_type_id: d.documentTypeId ?? null,
    correspondent_id: d.correspondentId ?? null,
    document_date: d.documentDate ?? null,
    asn: d.asn != null && d.asn !== "" && !Number.isNaN(Number(d.asn)) ? Number(d.asn) : null,
    custom_fields: d.customFields ?? {},
    tag_ids: tags.map((t) => t.id),
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),

    // Relations
    folder: d.folder ? (mapFolder(d.folder) ?? undefined) : undefined,
    uploaded_by_user: mapUserSummary(d.uploadedByUser),
    versions: d.versions?.map(mapVersion).filter((v) => v !== null),
    document_type: d.documentType ?? null,
    correspondent: d.correspondent ?? null,
    shares: (d.shares ?? []).map(mapShare).filter((s) => s !== null),

    // User Access
    user_access: d.userAccess
      ? {
          is_owner: d.userAccess.isOwner,
          access_level: d.userAccess.accessLevel,
          can_edit: d.userAccess.canEdit ?? d.userAccess.isOwner,
          can_download: d.userAccess.canDownload ?? true,
        }
      : undefined,
    applied_rules: d.appliedRules ?? [],

    // Timestamps
    created_at: d.createdAt ?? "",
    updated_at: d.updatedAt ?? "",
  };
}
