/**
 * Cache thumbnail di IndexedDB browser (data URL hasil render pdf.js / canvas).
 * Murni cache sisi klien: kunci = id dokumen + nomor versi, jadi versi baru
 * otomatis mendapat thumbnail baru. Aman dihapus kapan pun.
 */

const DB_NAME = "dms_thumb_cache";
const DB_VERSION = 1;
const STORE = "thumbs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Gagal membuka cache thumbnail."));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        let result: T | undefined;
        if (req) req.onsuccess = () => (result = req.result);
        t.oncomplete = () => {
          db.close();
          resolve(result);
        };
        t.onerror = () => {
          db.close();
          reject(t.error ?? new Error("Operasi cache thumbnail gagal."));
        };
      }),
  );
}

export async function getThumb(key: string): Promise<string | null> {
  try {
    return (await tx<string>("readonly", (s) => s.get(key))) ?? null;
  } catch {
    return null;
  }
}

export async function putThumb(key: string, dataUrl: string): Promise<void> {
  try {
    await tx("readwrite", (s) => s.put(dataUrl, key));
  } catch {
    /* mode privat / storage penuh — cukup render ulang lain kali */
  }
}

export async function clearThumbs(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    /* abaikan */
  }
}
