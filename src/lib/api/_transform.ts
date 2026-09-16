/**
 * Helper transform BE response (camelCase) → FE shape (snake_case).
 * BE return: { success, data, pagination? }
 * FE expect: shape snake_case langsung
 */

// ============ Generic Unwrap ============
export function unwrap<T>(response: any): T {
  if (response && typeof response === "object" && "data" in response) {
    return response.data as T;
  }
  return response as T;
}

// ============ User ============
export function mapUserSummary(u: any) {
  if (!u) return undefined;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  };
}

// ============ Folder ============
export function mapFolder(f: any) {
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

// ============ Document ============
export function mapDocument(d: any) {
  if (!d) return null;
  return {
    id: d.id,
    title: d.title,
    description: d.description ?? "",
    extension: d.extension,
    size_bytes: String(d.sizeBytes ?? "0"),
    folder_id: d.folderId,
    uploaded_by: d.uploadedBy,
    current_version: d.currentVersion ?? 1,
    status: d.status ?? "DRAFT",
    is_public: d.isPublic ?? false,
    deleted_at: d.deletedAt ?? null,

    // Metadata
    document_type_id: d.documentTypeId ?? null,
    correspondent_id: d.correspondentId ?? null,
    document_date: d.documentDate ?? null,
    asn: d.asn ?? null,
    custom_fields: d.customFields ?? {},
    tag_ids: (d.documentTags ?? [])
      .map((dt: any) => dt.tag?.id)
      .filter(Boolean),
    tags: (d.documentTags ?? []).map((dt: any) => ({
      id: dt.tag?.id,
      name: dt.tag?.name,
      color: dt.tag?.color,
    })),

    // Relations
    folder: d.folder ? mapFolder(d.folder) : undefined,
    uploaded_by_user: mapUserSummary(d.uploadedByUser),
    versions: d.versions?.map(mapVersion),
    document_type: d.documentType ?? null,
    correspondent: d.correspondent ?? null,

    // ✅ Shares
    shares: (d.shares ?? []).map((s: any) => ({
      id: s.id,
      document_id: s.documentId,
      user_id: s.userId,
      access_level: s.accessLevel,
      shared_by: s.sharedBy,
      expires_at: s.expiresAt ?? null,
      created_at: s.createdAt ?? "",
      user: mapUserSummary(s.user),
    })),

    // ✅ User Access
    user_access: d.userAccess
      ? {
          is_owner: d.userAccess.isOwner,
          access_level: d.userAccess.accessLevel,
        }
      : undefined,

    // Timestamps
    created_at: d.createdAt ?? "",
    updated_at: d.updatedAt ?? "",
  };
}

// ============ Version ============
export function mapVersion(v: any) {
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
    created_at: v.createdAt ?? "",
  };
}

// ============ Document Share ============
export function mapShare(s: any) {
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