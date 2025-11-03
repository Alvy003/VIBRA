// src/lib/downloads.ts
// Simple IndexedDB wrapper for storing song metadata and a reference to cache key.
// Uses Cache Storage for actual audio blobs.

const DB_NAME = "vibra-offline";
const DB_VERSION = 1;
const STORE_NAME = "songs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "_id" });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export type OfflineSongMeta = {
  _id: string;
  title: string;
  artist?: string;
  imageUrl?: string;
  audioUrl: string; // original url
  cachedAt: number;
  sizeBytes?: number;
};

export async function saveSongMeta(meta: OfflineSongMeta): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(meta);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getSongMeta(id: string): Promise<OfflineSongMeta | undefined> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => res(req.result as OfflineSongMeta | undefined);
    req.onerror = () => rej(req.error);
  });
}

export async function deleteSongMeta(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function listDownloadedSongs(): Promise<OfflineSongMeta[]> {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => res(req.result as OfflineSongMeta[]);
    req.onerror = () => rej(req.error);
  });
}
