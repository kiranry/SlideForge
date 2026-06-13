"use client";

import type { SavedDeckTemplate } from "@/lib/templates/saved-template";

const INDEX_KEY = "slideforge:templates:index";
const templateKey = (id: string) => `slideforge:template:${id}`;

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

export function listTemplates(): SavedDeckTemplate[] {
  return readIndex()
    .map((id) => getTemplate(id))
    .filter((t): t is SavedDeckTemplate => t !== null);
}

export function getTemplate(id: string): SavedDeckTemplate | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(templateKey(id));
    return raw ? (JSON.parse(raw) as SavedDeckTemplate) : null;
  } catch {
    return null;
  }
}

export function saveTemplate(template: SavedDeckTemplate): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(templateKey(template.id), JSON.stringify(template));
  const ids = readIndex().filter((id) => id !== template.id);
  writeIndex([template.id, ...ids]);
}

export function deleteTemplate(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(templateKey(id));
  writeIndex(readIndex().filter((x) => x !== id));
}
