import type {
  Folder,
  DocumentItem,
  DocumentVersion,
  DocumentDetail,
  FolderContents,
  TrashItem,
  DocumentMetaPatch,
  BulkMetaPatch,
  MetaKind,
} from "@/types";
import { recordActivity } from "@/lib/mocks/audit-store";
import { getMockActor } from "@/lib/mocks/actor";
import { putFile, deleteFiles } from "@/lib/mocks/file-store";

/**
 * MOCK data store untuk Folder & Dokumen — persist di localStorage browser.
 * Meniru perilaku backend Express (termasuk aturan: folder berisi dokumen tak
 * bisa dihapus, dan pencatatan audit log di setiap aksi penting).
 * Ganti dengan API asli begitu backend siap (lihat src/lib/api/*).
 */

const STORAGE_KEY = "dms_mock_data_v1";
const OWNER = "mock-employee";

/** Lama dokumen tersimpan di Sampah sebelum dibersihkan otomatis (pola Paperless-ngx). */
export const TRASH_RETENTION_DAYS = 30;

interface StoreShape {
  folders: Folder[];
  documents: DocumentItem[];
  versions: DocumentVersion[];
}

function nowIso(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Math.floor(performance.now() * 1000)}-${Date.now()}`;
}

/** Data awal (seed) agar aplikasi tidak kosong saat pertama dibuka. */
function seed(): StoreShape {
  const fKeuangan = "seed-folder-keuangan";
  const fLegal = "seed-folder-legal";
  const fHR = "seed-folder-hr";
  const fKeu2025 = "seed-folder-keu-2025";

  const folders: Folder[] = [
    { id: fKeuangan, name: "Keuangan", owner_id: OWNER, parent_folder_id: null, created_at: nowIso(30), updated_at: nowIso(5) },
    { id: fLegal, name: "Legal & Kontrak", owner_id: OWNER, parent_folder_id: null, created_at: nowIso(28), updated_at: nowIso(3) },
    { id: fHR, name: "SDM", owner_id: OWNER, parent_folder_id: null, created_at: nowIso(20), updated_at: nowIso(2) },
    { id: fKeu2025, name: "Laporan 2025", owner_id: OWNER, parent_folder_id: fKeuangan, created_at: nowIso(15), updated_at: nowIso(1) },
  ];

  const documents: DocumentItem[] = [
    { id: "seed-doc-1", title: "Laporan Keuangan Q4", extension: "pdf", size_bytes: "2411724", folder_id: fKeu2025, current_version: 2, status: "APPROVED", created_at: nowIso(14), updated_at: nowIso(1), tag_ids: ["seed-tag-keuangan", "seed-tag-2025"], document_type_id: "seed-type-laporan", correspondent_id: "seed-corr-bank", document_date: "2025-12-31T00:00:00.000Z", asn: 1001, description: "Laporan keuangan kuartal keempat beserta lampiran neraca dan arus kas." },
    { id: "seed-doc-2", title: "Anggaran Operasional", extension: "xlsx", size_bytes: "845000", folder_id: fKeuangan, current_version: 1, status: "DRAFT", created_at: nowIso(10), updated_at: nowIso(10), tag_ids: ["seed-tag-keuangan"], document_type_id: "seed-type-anggaran", correspondent_id: null, document_date: null, asn: 1002, description: null },
    { id: "seed-doc-3", title: "Perjanjian Kerja Sama Vendor", extension: "docx", size_bytes: "1200500", folder_id: fLegal, current_version: 3, status: "PENDING_REVIEW", created_at: nowIso(9), updated_at: nowIso(1), tag_ids: ["seed-tag-kontrak", "seed-tag-penting"], document_type_id: "seed-type-kontrak", correspondent_id: "seed-corr-mitra", document_date: "2026-08-15T00:00:00.000Z", asn: 1003, description: "Perjanjian kerja sama pengadaan dengan PT Mitra Sejahtera, masa berlaku 2 tahun." },
  ];

  const versions: DocumentVersion[] = [
    { id: uuid(), document_id: "seed-doc-1", version_number: 1, s3_file_key: "seed/keu-q4-v1.pdf", uploaded_by: OWNER, changelog: "Versi awal dokumen.", created_at: nowIso(14) },
    { id: uuid(), document_id: "seed-doc-1", version_number: 2, s3_file_key: "seed/keu-q4-v2.pdf", uploaded_by: OWNER, changelog: "Revisi angka pendapatan.", created_at: nowIso(1) },
    { id: uuid(), document_id: "seed-doc-2", version_number: 1, s3_file_key: "seed/anggaran-v1.xlsx", uploaded_by: OWNER, changelog: "Versi awal dokumen.", created_at: nowIso(10) },
    { id: uuid(), document_id: "seed-doc-3", version_number: 1, s3_file_key: "seed/vendor-v1.docx", uploaded_by: OWNER, changelog: "Draft awal.", created_at: nowIso(9) },
    { id: uuid(), document_id: "seed-doc-3", version_number: 2, s3_file_key: "seed/vendor-v2.docx", uploaded_by: OWNER, changelog: "Tambah pasal kerahasiaan.", created_at: nowIso(4) },
    { id: uuid(), document_id: "seed-doc-3", version_number: 3, s3_file_key: "seed/vendor-v3.docx", uploaded_by: OWNER, changelog: "Revisi pasal 4.", created_at: nowIso(1) },
  ];

  return { folders, documents, versions };
}

/** Hapus permanen dokumen di Sampah yang sudah melewati masa retensi. */
function purgeExpired(data: StoreShape): boolean {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 86_400_000;
  const expired = new Set(
    data.documents
      .filter((d) => d.deleted_at && new Date(d.deleted_at).getTime() < cutoff)
      .map((d) => d.id),
  );
  if (expired.size === 0) return false;
  data.documents = data.documents.filter((d) => !expired.has(d.id));
  data.versions = data.versions.filter((v) => !expired.has(v.document_id));
  return true;
}

function load(): StoreShape {
  if (typeof window === "undefined") return { folders: [], documents: [], versions: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const data = JSON.parse(raw) as StoreShape;
    let dirty = purgeExpired(data);
    // Migrasi: data lama belum punya kolom metadata → isi default agar UI aman.
    // Dokumen contoh (seed-doc-*) diisi ulang dari seed agar demo metadata tidak kosong.
    const seedDocs = seed().documents;
    for (const d of data.documents) {
      if (!Array.isArray(d.tag_ids)) {
        const sd = seedDocs.find((x) => x.id === d.id);
        d.tag_ids = sd?.tag_ids ?? [];
        d.document_type_id = sd?.document_type_id ?? null;
        d.correspondent_id = sd?.correspondent_id ?? null;
        d.document_date = sd?.document_date ?? null;
        d.asn = sd?.asn ?? null;
        d.description = sd?.description ?? null;
        dirty = true;
      }
      if (d.document_type_id === undefined) d.document_type_id = null;
      if (d.correspondent_id === undefined) d.correspondent_id = null;
      if (d.document_date === undefined) d.document_date = null;
      if (d.asn === undefined) d.asn = null;
      if (d.description === undefined) d.description = null;
    }
    if (dirty) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

/** Id folder beserta seluruh sub-foldernya (cascade). */
function collectDescendants(folders: Folder[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of folders) {
      if (f.parent_folder_id && out.has(f.parent_folder_id) && !out.has(f.id)) {
        out.add(f.id);
        changed = true;
      }
    }
  }
  return out;
}

function save(data: StoreShape): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Simulasi latensi jaringan agar UX (loading state) terasa realistis. */
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Baca daftar dokumen aktif (di luar Sampah) secara sinkron — dipakai mock store lain. */
export function peekDocuments(): DocumentItem[] {
  return load().documents.filter((d) => !d.deleted_at);
}

/** Baca daftar folder mentah secara sinkron (dipakai statistik dashboard mock). */
export function peekFolders(): Folder[] {
  return load().folders;
}

/** Lepas referensi metadata yang dihapus dari semua dokumen (dipanggil meta-store). */
export function detachMeta(kind: MetaKind, id: string): void {
  const data = load();
  let changed = false;
  for (const d of data.documents) {
    if (kind === "tag" && d.tag_ids?.includes(id)) {
      d.tag_ids = d.tag_ids.filter((t) => t !== id);
      changed = true;
    } else if (kind === "type" && d.document_type_id === id) {
      d.document_type_id = null;
      changed = true;
    } else if (kind === "correspondent" && d.correspondent_id === id) {
      d.correspondent_id = null;
      changed = true;
    }
  }
  if (changed) save(data);
}

/** Id versi (default: versi terkini) sebuah dokumen — kunci berkas di file-store. */
export function findVersionId(documentId: string, versionNumber?: number): string | null {
  const data = load();
  const doc = data.documents.find((d) => d.id === documentId);
  if (!doc) return null;
  const n = versionNumber ?? doc.current_version;
  return data.versions.find((v) => v.document_id === documentId && v.version_number === n)?.id ?? null;
}

export const mockStore = {
  async getContents(folderId: string): Promise<FolderContents> {
    const data = load();
    const targetId = folderId === "root" ? null : folderId;
    const subFolders = data.folders
      .filter((f) => f.parent_folder_id === targetId)
      .sort((a, b) => a.name.localeCompare(b.name));
    const documents = targetId
      ? data.documents
          .filter((d) => d.folder_id === targetId && !d.deleted_at)
          .sort((a, b) => a.title.localeCompare(b.title))
      : [];
    return delay({ folderId: targetId, subFolders, documents });
  },

  /** Seluruh folder (untuk pemilih tujuan "Pindahkan ke"). */
  async listFolders(): Promise<Folder[]> {
    return delay([...load().folders].sort((a, b) => a.name.localeCompare(b.name)), 150);
  },

  /** Meniru PATCH /folders/:id/move — tolak pindah ke diri sendiri / turunannya. */
  async moveFolder(id: string, newParentId: string | null): Promise<Folder> {
    const data = load();
    const folder = data.folders.find((f) => f.id === id);
    if (!folder) throw new Error("Folder tidak ditemukan.");
    if (newParentId) {
      if (!data.folders.some((f) => f.id === newParentId)) throw new Error("Folder tujuan tidak ditemukan.");
      if (collectDescendants(data.folders, id).has(newParentId)) {
        throw new Error("Folder tidak dapat dipindahkan ke dalam dirinya sendiri atau sub-foldernya.");
      }
    }
    if (folder.parent_folder_id === newParentId) return delay(folder);
    folder.parent_folder_id = newParentId;
    folder.updated_at = new Date().toISOString();
    save(data);
    const dest = newParentId ? data.folders.find((f) => f.id === newParentId)?.name : "Root";
    recordActivity("MOVE_FOLDER", `Memindahkan folder "${folder.name}" ke "${dest}"`);
    return delay(folder);
  },

  async getFolderPath(folderId: string): Promise<Folder[]> {
    const data = load();
    if (folderId === "root") return delay([]);
    const path: Folder[] = [];
    let current = data.folders.find((f) => f.id === folderId);
    while (current) {
      path.unshift(current);
      current = current.parent_folder_id
        ? data.folders.find((f) => f.id === current!.parent_folder_id)
        : undefined;
    }
    return delay(path);
  },

  async createFolder(input: { name: string; parent_folder_id: string | null }): Promise<Folder> {
    const data = load();
    const folder: Folder = {
      id: uuid(),
      name: input.name.trim(),
      owner_id: OWNER,
      parent_folder_id: input.parent_folder_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.folders.push(folder);
    save(data);
    recordActivity("CREATE_FOLDER", `Membuat folder "${folder.name}"`);
    return delay(folder);
  },

  async renameFolder(id: string, name: string): Promise<Folder> {
    const data = load();
    const folder = data.folders.find((f) => f.id === id);
    if (!folder) throw new Error("Folder tidak ditemukan.");
    const oldName = folder.name;
    folder.name = name.trim();
    folder.updated_at = new Date().toISOString();
    save(data);
    recordActivity("RENAME_FOLDER", `Mengganti nama folder "${oldName}" menjadi "${folder.name}"`);
    return delay(folder);
  },

  async deleteFolder(id: string): Promise<void> {
    const data = load();
    const hasDocs = data.documents.some((d) => d.folder_id === id && !d.deleted_at);
    if (hasDocs) {
      throw new Error(
        "Folder tidak dapat dihapus karena masih berisi dokumen. Pindahkan atau hapus dokumen terlebih dahulu.",
      );
    }
    // Hapus folder beserta seluruh sub-folder (cascade); dokumen di Sampah
    // yang folder asalnya ikut terhapus dibersihkan permanen (tak ada tempat pulih).
    const toDelete = collectDescendants(data.folders, id);
    const folderName = data.folders.find((f) => f.id === id)?.name ?? id;
    const orphaned = new Set(
      data.documents.filter((d) => toDelete.has(d.folder_id)).map((d) => d.id),
    );
    const orphanVersionIds = data.versions.filter((v) => orphaned.has(v.document_id)).map((v) => v.id);
    data.folders = data.folders.filter((f) => !toDelete.has(f.id));
    data.documents = data.documents.filter((d) => !orphaned.has(d.id));
    data.versions = data.versions.filter((v) => !orphaned.has(v.document_id));
    save(data);
    await deleteFiles(orphanVersionIds);
    recordActivity("DELETE_FOLDER", `Menghapus folder "${folderName}"`);
    return delay(undefined);
  },

  async createDocument(input: {
    title: string;
    extension: string;
    size_bytes: number;
    folder_id: string;
    /** Berkas asli (opsional) — disimpan ke IndexedDB untuk pratinjau/unduh. */
    file?: File;
  }): Promise<DocumentItem> {
    const data = load();
    if (!data.folders.some((f) => f.id === input.folder_id)) throw new Error("Folder tujuan tidak ditemukan.");
    const doc: DocumentItem = {
      id: uuid(),
      title: input.title.trim(),
      extension: input.extension,
      size_bytes: String(input.size_bytes),
      folder_id: input.folder_id,
      current_version: 1,
      status: "DRAFT",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tag_ids: [],
      document_type_id: null,
      correspondent_id: null,
      document_date: null,
      asn: null,
      description: null,
    };
    const versionId = uuid();
    data.documents.push(doc);
    data.versions.push({
      id: versionId,
      document_id: doc.id,
      version_number: 1,
      s3_file_key: input.file ? `local/${versionId}/${input.file.name}` : `pending-upload/${versionId}.${input.extension}`,
      uploaded_by: getMockActor().id,
      changelog: "Versi awal dokumen.",
      created_at: doc.created_at,
    });
    save(data);
    if (input.file) await putFile(versionId, input.file);
    recordActivity("CREATE_DOCUMENT", `Mengunggah dokumen "${doc.title}" (v1)`, { document_id: doc.id });
    return delay(doc);
  },

  async getDocument(id: string): Promise<DocumentDetail> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    if (doc.deleted_at) throw new Error("Dokumen berada di Sampah. Pulihkan dulu untuk membukanya.");
    const folder = data.folders.find((f) => f.id === doc.folder_id);
    if (!folder) throw new Error("Folder dokumen tidak ditemukan.");
    const versions = data.versions
      .filter((v) => v.document_id === id)
      .sort((a, b) => b.version_number - a.version_number);
    return delay({ ...doc, folder, versions });
  },

  async renameDocument(id: string, title: string): Promise<DocumentItem> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    const oldTitle = doc.title;
    doc.title = title.trim();
    doc.updated_at = new Date().toISOString();
    save(data);
    recordActivity("RENAME_DOCUMENT", `Mengganti judul dokumen "${oldTitle}" menjadi "${doc.title}"`, {
      document_id: id,
    });
    return delay(doc);
  },

  /** Soft delete: dokumen masuk Sampah, dibersihkan otomatis setelah TRASH_RETENTION_DAYS. */
  async deleteDocument(id: string): Promise<void> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    if (doc.deleted_at) throw new Error("Dokumen sudah berada di Sampah.");
    doc.deleted_at = new Date().toISOString();
    save(data);
    recordActivity("TRASH_DOCUMENT", `Memindahkan dokumen "${doc.title}" ke Sampah`, {
      document_id: id,
    });
    return delay(undefined);
  },

  /** Isi Sampah: dokumen terhapus + nama folder asal + jadwal pembersihan. */
  async getTrash(): Promise<TrashItem[]> {
    const data = load();
    const items = data.documents
      .filter((d) => d.deleted_at)
      .map<TrashItem>((d) => ({
        ...d,
        folder_name: data.folders.find((f) => f.id === d.folder_id)?.name ?? "—",
        purge_at: new Date(
          new Date(d.deleted_at!).getTime() + TRASH_RETENTION_DAYS * 86_400_000,
        ).toISOString(),
      }))
      .sort((a, b) => b.deleted_at!.localeCompare(a.deleted_at!));
    return delay(items);
  },

  async restoreDocument(id: string): Promise<DocumentItem> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc || !doc.deleted_at) throw new Error("Dokumen tidak ada di Sampah.");
    if (!data.folders.some((f) => f.id === doc.folder_id)) {
      throw new Error("Folder asal sudah tidak ada. Dokumen tidak dapat dipulihkan.");
    }
    doc.deleted_at = null;
    doc.updated_at = new Date().toISOString();
    save(data);
    recordActivity("RESTORE_DOCUMENT", `Memulihkan dokumen "${doc.title}" dari Sampah`, {
      document_id: id,
    });
    return delay(doc);
  },

  /** Hapus permanen (hanya dari Sampah). */
  async purgeDocument(id: string): Promise<void> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc || !doc.deleted_at) throw new Error("Dokumen tidak ada di Sampah.");
    const versionIds = data.versions.filter((v) => v.document_id === id).map((v) => v.id);
    data.documents = data.documents.filter((d) => d.id !== id);
    data.versions = data.versions.filter((v) => v.document_id !== id);
    save(data);
    await deleteFiles(versionIds);
    recordActivity("DELETE_DOCUMENT", `Menghapus permanen dokumen "${doc.title}" beserta seluruh versinya`, {
      document_id: id,
    });
    return delay(undefined);
  },

  /** Kosongkan Sampah; mengembalikan jumlah dokumen yang dihapus permanen. */
  async emptyTrash(): Promise<number> {
    const data = load();
    const trashed = data.documents.filter((d) => d.deleted_at);
    if (trashed.length === 0) return delay(0);
    const ids = new Set(trashed.map((d) => d.id));
    const versionIds = data.versions.filter((v) => ids.has(v.document_id)).map((v) => v.id);
    data.documents = data.documents.filter((d) => !ids.has(d.id));
    data.versions = data.versions.filter((v) => !ids.has(v.document_id));
    save(data);
    await deleteFiles(versionIds);
    recordActivity("DELETE_DOCUMENT", `Mengosongkan Sampah (${trashed.length} dokumen dihapus permanen)`);
    return delay(trashed.length);
  },

  /** Ubah metadata satu dokumen (tag, tipe, pihak, tanggal dokumen, ASN, deskripsi). */
  async updateDocumentMeta(id: string, patch: DocumentMetaPatch): Promise<DocumentItem> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id && !d.deleted_at);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    if (patch.asn != null && data.documents.some((d) => d.id !== id && d.asn === patch.asn)) {
      throw new Error(`Nomor arsip ${patch.asn} sudah dipakai dokumen lain.`);
    }
    if (patch.tag_ids !== undefined) doc.tag_ids = Array.from(new Set(patch.tag_ids));
    if (patch.document_type_id !== undefined) doc.document_type_id = patch.document_type_id;
    if (patch.correspondent_id !== undefined) doc.correspondent_id = patch.correspondent_id;
    if (patch.document_date !== undefined) doc.document_date = patch.document_date;
    if (patch.asn !== undefined) doc.asn = patch.asn;
    if (patch.description !== undefined) doc.description = patch.description;
    doc.updated_at = new Date().toISOString();
    save(data);
    recordActivity("UPDATE_DOCUMENT_META", `Mengubah metadata dokumen "${doc.title}"`, { document_id: id });
    return delay(doc);
  },

  /** Ubah metadata massal; mengembalikan jumlah dokumen yang diubah. */
  async bulkUpdateMeta(ids: string[], patch: BulkMetaPatch): Promise<number> {
    const data = load();
    const set = new Set(ids);
    let n = 0;
    for (const doc of data.documents) {
      if (!set.has(doc.id) || doc.deleted_at) continue;
      const tags = new Set(doc.tag_ids ?? []);
      for (const t of patch.add_tag_ids ?? []) tags.add(t);
      for (const t of patch.remove_tag_ids ?? []) tags.delete(t);
      doc.tag_ids = Array.from(tags);
      if (patch.document_type_id !== undefined) doc.document_type_id = patch.document_type_id;
      if (patch.correspondent_id !== undefined) doc.correspondent_id = patch.correspondent_id;
      doc.updated_at = new Date().toISOString();
      n += 1;
    }
    save(data);
    if (n > 0) recordActivity("UPDATE_DOCUMENT_META", `Mengubah metadata ${n} dokumen sekaligus`);
    return delay(n);
  },

  /** Pindahkan dokumen ke folder lain (backend belum punya endpoint ini). */
  async moveDocument(id: string, folderId: string): Promise<DocumentItem> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id && !d.deleted_at);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    const dest = data.folders.find((f) => f.id === folderId);
    if (!dest) throw new Error("Folder tujuan tidak ditemukan.");
    if (doc.folder_id === folderId) return delay(doc);
    const from = data.folders.find((f) => f.id === doc.folder_id)?.name ?? "—";
    doc.folder_id = folderId;
    doc.updated_at = new Date().toISOString();
    save(data);
    recordActivity("MOVE_DOCUMENT", `Memindahkan dokumen "${doc.title}" dari "${from}" ke "${dest.name}"`, {
      document_id: id,
    });
    return delay(doc);
  },

  async uploadNewVersion(
    id: string,
    input: { size_bytes: number; changelog?: string; extension?: string; file?: File },
  ): Promise<DocumentItem> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id && !d.deleted_at);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    const versionNumber = doc.current_version + 1;
    const versionId = uuid();
    data.versions.push({
      id: versionId,
      document_id: id,
      version_number: versionNumber,
      s3_file_key: input.file
        ? `local/${versionId}/${input.file.name}`
        : `pending-upload/${versionId}.${input.extension ?? doc.extension}`,
      uploaded_by: getMockActor().id,
      changelog: input.changelog ?? null,
      created_at: new Date().toISOString(),
    });
    doc.current_version = versionNumber;
    doc.size_bytes = String(input.size_bytes);
    doc.extension = input.extension ?? doc.extension;
    doc.status = "PENDING_REVIEW";
    doc.updated_at = new Date().toISOString();
    save(data);
    if (input.file) await putFile(versionId, input.file);
    recordActivity(
      "UPLOAD_VERSION",
      `Mengunggah versi ${versionNumber} dokumen "${doc.title}"${input.changelog ? ` — ${input.changelog}` : ""}`,
      { document_id: id },
    );
    return delay(doc);
  },
};
