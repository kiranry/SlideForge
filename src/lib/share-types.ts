import type {
  AnomalyFlag,
  CustomThemePalette,
  ParsedData,
  SlideManifest,
} from "@/lib/types";

export interface SlideComment {
  id: string;
  slideIndex: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
}

/** Deck payload stored server-side for share links. */
export interface ShareDeckSnapshot {
  manifest: SlideManifest;
  data?: ParsedData | null;
  customTheme?: CustomThemePalette | null;
  logoDataUrl?: string | null;
  logoOnAllSlides?: boolean;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
}

export interface ShareRecord {
  token: string;
  createdAt: string;
  expiresAt: string | null;
  allowDownload: boolean;
  deckTitle: string;
  ownerDeckId: string;
  revoked: boolean;
  snapshot: ShareDeckSnapshot;
  comments: SlideComment[];
}

/** Owner-side metadata kept in localStorage (tokens only). */
export interface OwnerShareMeta {
  token: string;
  deckId: string;
  deckTitle: string;
  createdAt: string;
  expiresAt: string | null;
  allowDownload: boolean;
}

export interface DeckVersion {
  id: string;
  createdAt: string;
  label?: string;
  manifest: SlideManifest;
}
