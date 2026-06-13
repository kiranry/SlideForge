"use client";

import { hydrateDeckMedia, stripDeckMedia } from "@/lib/deck-media";
import { deleteAllDeckImages } from "@/lib/image-store";
import type { StoredDeck } from "@/lib/types";

/**
 * localStorage-backed deck persistence (MVP, stateless per PRD Section 9.5).
 * Large images are stored in IndexedDB (Phase 8) and hydrated on load.
 */

const INDEX_KEY = "slideforge:index";
const deckKey = (id: string) => `slideforge:deck:${id}`;

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(ids));
}

function readDeckRaw(id: string): StoredDeck | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(deckKey(id));
    return raw ? (JSON.parse(raw) as StoredDeck) : null;
  } catch {
    return null;
  }
}

function writeDeckRaw(deck: StoredDeck): void {
  localStorage.setItem(deckKey(deck.id), JSON.stringify(deck));
  const ids = readIndex().filter((deckId) => deckId !== deck.id);
  writeIndex([deck.id, ...ids]);
}

/** Load deck with images hydrated from IndexedDB. */
export async function loadDeck(id: string): Promise<StoredDeck | null> {
  const raw = readDeckRaw(id);
  if (!raw) return null;
  return hydrateDeckMedia(raw);
}

/** Sync read without IndexedDB hydration — thumbnails / metadata only. */
export function getDeck(id: string): StoredDeck | null {
  return readDeckRaw(id);
}

export async function saveDeck(deck: StoredDeck): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const stripped = await stripDeckMedia(deck);
    writeDeckRaw(stripped);
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22)
    ) {
      throw new Error(
        "Deck is too large to save locally. Try a smaller image or remove media from other slides."
      );
    }
    throw err;
  }
}

export function listDecks(): StoredDeck[] {
  return readIndex()
    .map((id) => getDeck(id))
    .filter((d): d is StoredDeck => d !== null);
}

export async function deleteDeck(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(deckKey(id));
  writeIndex(readIndex().filter((x) => x !== id));
  try {
    await deleteAllDeckImages(id);
  } catch {
    /* non-fatal */
  }
}

/** Merge updates into an existing deck and persist. */
export async function updateDeck(
  id: string,
  patch: Partial<StoredDeck>
): Promise<StoredDeck | null> {
  const deck = await loadDeck(id);
  if (!deck) return null;
  const updated: StoredDeck = { ...deck, ...patch };
  await saveDeck(updated);
  return updated;
}
