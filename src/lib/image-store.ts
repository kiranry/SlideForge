"use client";

/**
 * IndexedDB store for deck images (Phase 8).
 * Keeps large data URLs out of localStorage.
 */

const DB_NAME = "slideforge-images";
const STORE_NAME = "images";
const DB_VERSION = 1;

function imageKey(deckId: string, ref: string): string {
  return `${deckId}:${ref}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is only available in the browser"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function putDeckImage(
  deckId: string,
  ref: string,
  dataUrl: string
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB write failed"));
    };
    tx.objectStore(STORE_NAME).put(dataUrl, imageKey(deckId, ref));
  });
}

export async function getDeckImage(
  deckId: string,
  ref: string
): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(imageKey(deckId, ref));
    request.onsuccess = () => {
      db.close();
      resolve((request.result as string | undefined) ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error("IndexedDB read failed"));
    };
  });
}

export async function deleteDeckImage(deckId: string, ref: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB delete failed"));
    };
    tx.objectStore(STORE_NAME).delete(imageKey(deckId, ref));
  });
}

export async function deleteAllDeckImages(deckId: string): Promise<void> {
  const db = await openDb();
  const prefix = `${deckId}:`;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;
      const key = String(cursor.key);
      if (key.startsWith(prefix)) {
        cursor.delete();
      }
      cursor.continue();
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("IndexedDB bulk delete failed"));
    };
  });
}
