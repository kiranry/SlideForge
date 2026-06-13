"use client";

import type { OwnerShareMeta } from "@/lib/share-types";

const KEY = "slideforge:owner-shares";

function readAll(): OwnerShareMeta[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as OwnerShareMeta[];
  } catch {
    return [];
  }
}

function writeAll(items: OwnerShareMeta[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function listOwnerShares(deckId?: string): OwnerShareMeta[] {
  const all = readAll();
  if (!deckId) return all;
  return all.filter((s) => s.deckId === deckId);
}

export function addOwnerShare(meta: OwnerShareMeta): void {
  const all = readAll().filter((s) => s.token !== meta.token);
  writeAll([meta, ...all]);
}

export function removeOwnerShare(token: string): void {
  writeAll(readAll().filter((s) => s.token !== token));
}
