import type { DeckVersion } from "@/lib/share-types";
import type { SlideManifest, StoredDeck } from "@/lib/types";

const MAX_VERSIONS = 20;

export function pushDeckVersion(
  deck: StoredDeck,
  label?: string
): DeckVersion[] {
  const version: DeckVersion = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    label,
    manifest: JSON.parse(JSON.stringify(deck.manifest)) as SlideManifest,
  };
  const prev = deck.versions ?? [];
  return [version, ...prev].slice(0, MAX_VERSIONS);
}

export function restoreDeckVersion(
  deck: StoredDeck,
  versionId: string
): SlideManifest | null {
  const version = deck.versions?.find((v) => v.id === versionId);
  if (!version) return null;
  return JSON.parse(JSON.stringify(version.manifest)) as SlideManifest;
}
