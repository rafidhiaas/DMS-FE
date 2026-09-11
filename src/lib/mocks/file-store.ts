/**
 * MOCK penyimpanan berkas — pengganti sementara Object Storage (S3).
 * Berkas yang diunggah pengguna disimpan di IndexedDB browser, dikunci dengan
 * id versi dokumen, sehingga pratinjau & unduh berkas asli bisa dicoba end-to-end.
 * Saat S3 siap, ganti pemanggil (lib/api/files.ts, lib/download.ts) dengan presigned URL.
 */

const DB_NAME = "dms_mock_files";
const DB_VERSION = 1;
const STORE = "files";

export interface StoredFile {
  blob: Blob;
  name: string;
  type: string;
  size: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Gagal membuka penyimpanan berkas."));
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = run(store);
        let result: T | undefined;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => {
          db.close();
          resolve(result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error ?? new Error("Operasi penyimpanan berkas gagal."));
        };
      }),
  );
}

/** Simpan berkas untuk satu versi dokumen. Gagal diam-diam bila IndexedDB terblokir. */
export async function putFile(versionId: string, file: File): Promise<void> {
  try {
    const record: StoredFile = { blob: file, name: file.name, type: file.type, size: file.size };
    await tx("readwrite", (s) => s.put(record, versionId));
  } catch {
    /* mode privat / storage penuh — berkas tidak tersimpan, metadata tetap ada */
  }
}

export async function getFile(versionId: string): Promise<StoredFile | null> {
  try {
    const rec = await tx<StoredFile>("readonly", (s) => s.get(versionId));
    return rec ?? null;
  } catch {
    return null;
  }
}

export async function deleteFiles(versionIds: string[]): Promise<void> {
  if (versionIds.length === 0) return;
  try {
    await tx("readwrite", (s) => {
      for (const id of versionIds) s.delete(id);
    });
  } catch {
    /* abaikan */
  }
}
