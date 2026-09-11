import type {
  Folder,
  DocumentItem,
  DocumentVersion,
  DocumentDetail,
  FolderContents,
} from "@/types";
import { recordActivity } from "@/lib/mocks/audit-store";
import { getMockActor } from "@/lib/mocks/actor";

/**
 * MOCK data store untuk Folder & Dokumen — persist di localStorage browser.
 * Meniru perilaku backend Express (termasuk aturan: folder berisi dokumen tak
 * bisa dihapus, dan pencatatan audit log di setiap aksi penting).
 * Ganti dengan API asli begitu backend siap (lihat src/lib/api/*).
 */

const STORAGE_KEY = "dms_mock_data_v1";
const OWNER = "mock-employee";

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
    { id: "seed-doc-1", title: "Laporan Keuangan Q4", extension: "pdf", size_bytes: "2411724", folder_id: fKeu2025, current_version: 2, status: "APPROVED", created_at: nowIso(14), updated_at: nowIso(1) },
    { id: "seed-doc-2", title: "Anggaran Operasional", extension: "xlsx", size_bytes: "845000", folder_id: fKeuangan, current_version: 1, status: "DRAFT", created_at: nowIso(10), updated_at: nowIso(10) },
    { id: "seed-doc-3", title: "Perjanjian Kerja Sama Vendor", extension: "docx", size_bytes: "1200500", folder_id: fLegal, current_version: 3, status: "PENDING_REVIEW", created_at: nowIso(9), updated_at: nowIso(1) },
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

function load(): StoreShape {
  if (typeof window === "undefined") return { folders: [], documents: [], versions: [] };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as StoreShape;
  } catch {
    const initial = seed();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
}

function save(data: StoreShape): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Simulasi latensi jaringan agar UX (loading state) terasa realistis. */
function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Baca daftar dokumen mentah secara sinkron (dipakai mock store lain, mis. share). */
export function peekDocuments(): DocumentItem[] {
  return load().documents;
}

/** Baca daftar folder mentah secara sinkron (dipakai statistik dashboard mock). */
export function peekFolders(): Folder[] {
  return load().folders;
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
          .filter((d) => d.folder_id === targetId)
          .sort((a, b) => a.title.localeCompare(b.title))
      : [];
    return delay({ folderId: targetId, subFolders, documents });
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
    const hasDocs = data.documents.some((d) => d.folder_id === id);
    if (hasDocs) {
      throw new Error(
        "Folder tidak dapat dihapus karena masih berisi dokumen. Pindahkan atau hapus dokumen terlebih dahulu.",
      );
    }
    // Hapus folder beserta seluruh sub-folder (cascade).
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of data.folders) {
        if (f.parent_folder_id && toDelete.has(f.parent_folder_id) && !toDelete.has(f.id)) {
          toDelete.add(f.id);
          changed = true;
        }
      }
    }
    const folderName = data.folders.find((f) => f.id === id)?.name ?? id;
    data.folders = data.folders.filter((f) => !toDelete.has(f.id));
    save(data);
    recordActivity("DELETE_FOLDER", `Menghapus folder "${folderName}"`);
    return delay(undefined);
  },

  async createDocument(input: {
    title: string;
    extension: string;
    size_bytes: number;
    folder_id: string;
  }): Promise<DocumentItem> {
    const data = load();
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
    };
    data.documents.push(doc);
    data.versions.push({
      id: uuid(),
      document_id: doc.id,
      version_number: 1,
      s3_file_key: `pending-upload/${uuid()}.${input.extension}`,
      uploaded_by: getMockActor().id,
      changelog: "Versi awal dokumen.",
      created_at: doc.created_at,
    });
    save(data);
    recordActivity("CREATE_DOCUMENT", `Mengunggah dokumen "${doc.title}" (v1)`, { document_id: doc.id });
    return delay(doc);
  },

  async getDocument(id: string): Promise<DocumentDetail> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
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

  async deleteDocument(id: string): Promise<void> {
    const data = load();
    const title = data.documents.find((d) => d.id === id)?.title ?? id;
    data.documents = data.documents.filter((d) => d.id !== id);
    data.versions = data.versions.filter((v) => v.document_id !== id);
    save(data);
    recordActivity("DELETE_DOCUMENT", `Menghapus dokumen "${title}" beserta seluruh versinya`, {
      document_id: id,
    });
    return delay(undefined);
  },

  async uploadNewVersion(
    id: string,
    input: { size_bytes: number; changelog?: string; extension?: string },
  ): Promise<DocumentItem> {
    const data = load();
    const doc = data.documents.find((d) => d.id === id);
    if (!doc) throw new Error("Dokumen tidak ditemukan.");
    const versionNumber = doc.current_version + 1;
    data.versions.push({
      id: uuid(),
      document_id: id,
      version_number: versionNumber,
      s3_file_key: `pending-upload/${uuid()}.${input.extension ?? doc.extension}`,
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
    recordActivity(
      "UPLOAD_VERSION",
      `Mengunggah versi ${versionNumber} dokumen "${doc.title}"${input.changelog ? ` — ${input.changelog}` : ""}`,
      { document_id: id },
    );
    return delay(doc);
  },
};
