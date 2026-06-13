import type { SlideManifest } from "@/lib/types";

const MAX_HISTORY = 50;

function cloneManifest(manifest: SlideManifest): SlideManifest {
  return JSON.parse(JSON.stringify(manifest)) as SlideManifest;
}

export interface ManifestHistory {
  push: (manifest: SlideManifest) => void;
  undo: () => SlideManifest | null;
  redo: () => SlideManifest | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: (manifest: SlideManifest) => void;
}

/** Undo/redo stack for manifest edits (Phase 8). */
export function createManifestHistory(initial: SlideManifest): ManifestHistory {
  let past: SlideManifest[] = [cloneManifest(initial)];
  let future: SlideManifest[] = [];

  const snapshot = () => JSON.stringify;

  return {
    push(manifest: SlideManifest) {
      const last = past[past.length - 1];
      if (snapshot()(last) === snapshot()(manifest)) return;
      past.push(cloneManifest(manifest));
      if (past.length > MAX_HISTORY) past.shift();
      future = [];
    },

    undo(): SlideManifest | null {
      if (past.length <= 1) return null;
      future.push(past.pop()!);
      return cloneManifest(past[past.length - 1]);
    },

    redo(): SlideManifest | null {
      if (!future.length) return null;
      const next = future.pop()!;
      past.push(next);
      return cloneManifest(next);
    },

    canUndo: () => past.length > 1,
    canRedo: () => future.length > 0,

    reset(manifest: SlideManifest) {
      past = [cloneManifest(manifest)];
      future = [];
    },
  };
}
