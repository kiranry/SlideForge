"use client";

import type { BrandKit } from "@/lib/brand-kit";

const INDEX_KEY = "slideforge:brand-kits:index";
const LAST_KEY = "slideforge:brand-kits:last-used";
const kitKey = (id: string) => `slideforge:brand-kit:${id}`;

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

export function listBrandKits(): BrandKit[] {
  return readIndex()
    .map((id) => getBrandKit(id))
    .filter((k): k is BrandKit => k !== null);
}

export function getBrandKit(id: string): BrandKit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(kitKey(id));
    return raw ? (JSON.parse(raw) as BrandKit) : null;
  } catch {
    return null;
  }
}

export function saveBrandKit(kit: BrandKit): void {
  if (typeof window === "undefined") return;
  const updated = { ...kit, updatedAt: new Date().toISOString() };
  localStorage.setItem(kitKey(updated.id), JSON.stringify(updated));
  const ids = readIndex().filter((id) => id !== updated.id);
  writeIndex([updated.id, ...ids]);
}

export function deleteBrandKit(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(kitKey(id));
  writeIndex(readIndex().filter((x) => x !== id));
  if (getLastUsedBrandKitId() === id) {
    localStorage.removeItem(LAST_KEY);
  }
}

export function getLastUsedBrandKitId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_KEY);
}

export function setLastUsedBrandKitId(id: string | null): void {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(LAST_KEY, id);
  else localStorage.removeItem(LAST_KEY);
}

export function getLastUsedBrandKit(): BrandKit | null {
  const id = getLastUsedBrandKitId();
  return id ? getBrandKit(id) : null;
}
