import type { z } from "zod";
import type { DeckVersion, SlideComment } from "@/lib/share-types";
import type {
  slideTypeSchema,
  chartTypeSchema,
  layoutHintSchema,
  toneSchema,
  audienceSchema,
  inputModeSchema,
  columnTypeSchema,
  chartSpecSchema,
  kpiSchema,
  tableDataSchema,
  comparisonSchema,
  quoteSchema,
  timelineItemSchema,
  slideSchema,
  slideManifestSchema,
  parsedColumnSchema,
  parsedSheetSchema,
  parsedDataSchema,
  chartRecommendationSchema,
  chartRecommendationsSchema,
  anomalyFlagSchema,
  deckStructureSchema,
  slideImageSchema,
} from "@/lib/schema";

/* Enum types */
export type SlideType = z.infer<typeof slideTypeSchema>;
export type ChartType = z.infer<typeof chartTypeSchema>;
export type LayoutHint = z.infer<typeof layoutHintSchema>;
export type Tone = z.infer<typeof toneSchema>;
export type Audience = z.infer<typeof audienceSchema>;
export type InputMode = z.infer<typeof inputModeSchema>;
export type ColumnType = z.infer<typeof columnTypeSchema>;

/* Slide structures */
export type ChartSpec = z.infer<typeof chartSpecSchema>;
export type Kpi = z.infer<typeof kpiSchema>;
export type TableData = z.infer<typeof tableDataSchema>;
export type Comparison = z.infer<typeof comparisonSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type SlideManifest = z.infer<typeof slideManifestSchema>;

/* Data parsing structures */
export type ParsedColumn = z.infer<typeof parsedColumnSchema>;
export type ParsedSheet = z.infer<typeof parsedSheetSchema>;
export type ParsedData = z.infer<typeof parsedDataSchema>;
export type ChartRecommendation = z.infer<typeof chartRecommendationSchema>;
export type ChartRecommendations = z.infer<typeof chartRecommendationsSchema>;
export type AnomalyFlag = z.infer<typeof anomalyFlagSchema>;
export type DeckStructure = z.infer<typeof deckStructureSchema>;
export type SlideImage = z.infer<typeof slideImageSchema>;

/** Options collected in the builder UI and sent to the outline API. */
export interface OutlineOptions {
  description: string;
  slideCount: number;
  tone: Tone;
  audience: Audience;
  theme: string;
  language: string;
}

/** User-defined deck theme colors (hex without #). */
export interface CustomThemePalette {
  primary: string;
  secondary: string;
  accent: string;
}

/** A generated deck as persisted in localStorage history. */
export interface StoredDeck {
  id: string;
  createdAt: string;
  mode: InputMode;
  manifest: SlideManifest;
  /** Parsed source data, kept so charts can be re-exported. */
  data?: ParsedData | null;
  /** True when the user edited deck data in preview (Phase 7). */
  dataModified?: boolean;
  /** Custom theme when manifest.theme === "custom". */
  customTheme?: CustomThemePalette | null;
  /** Logo as a data URL (PNG/JPEG) — hydrated at runtime. */
  logoDataUrl?: string | null;
  /** IndexedDB ref when logo is externalized from localStorage. */
  logoRef?: string | null;
  /** Place logo on every slide footer, not just title. */
  logoOnAllSlides?: boolean;
  /** Statistical anomalies detected from source data. */
  anomalyFlags?: AnomalyFlag[];
  /** IDs of anomaly flags the user chose to hide before export. */
  suppressedAnomalyIds?: string[];
  /** Structure extracted from an uploaded competitor .pptx. */
  structureSkeleton?: DeckStructure | null;
  /** Owner notes / merged share feedback (Phase 12). */
  comments?: SlideComment[];
  /** Manifest snapshots — auto-created on export (Phase 12). */
  versions?: DeckVersion[];
  /** Brand kit applied at creation (Phase 14). */
  brandKitId?: string | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  chartColors?: string[] | null;
}
