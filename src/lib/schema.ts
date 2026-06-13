import { z } from "zod";

/**
 * The slide manifest is the spine of SlideForge. Claude produces it, the HTML
 * previewer renders it, and the pptxgenjs engine builds the final .pptx from
 * it. This file is the single source of truth — keep it in sync with the
 * outline prompt contract (PRD Section 5.1) and the renderer.
 */

/* ----------------------------------------------------------------------------
 * Enumerations
 * ------------------------------------------------------------------------- */

export const SLIDE_TYPES = [
  "title",
  "divider",
  "content",
  "chart",
  "kpi",
  "table",
  "comparison",
  "quote",
  "timeline",
  "closing",
] as const;
export const slideTypeSchema = z.enum(SLIDE_TYPES);

export const CHART_TYPES = [
  "bar",
  "line",
  "area",
  "pie",
  "donut",
  "scatter",
  "combo",
] as const;
export const chartTypeSchema = z.enum(CHART_TYPES);

export const LAYOUT_HINTS = [
  "hero",
  "two_col",
  "grid_2x2",
  "full_bleed",
  "standard",
] as const;
export const layoutHintSchema = z.enum(LAYOUT_HINTS);

export const TONES = [
  "professional",
  "casual",
  "academic",
  "sales",
  "technical",
] as const;
export const toneSchema = z.enum(TONES);

export const AUDIENCES = [
  "executive",
  "general",
  "technical",
  "investor",
] as const;
export const audienceSchema = z.enum(AUDIENCES);

export const INPUT_MODES = ["description", "data", "combined"] as const;
export const inputModeSchema = z.enum(INPUT_MODES);

/* ----------------------------------------------------------------------------
 * Slide sub-structures
 * ------------------------------------------------------------------------- */

/** A chart attached to a slide. `data_ref` points at a parsed dataset key. */
export const chartSpecSchema = z.object({
  type: chartTypeSchema,
  data_ref: z.string().nullable().default(null),
  /** Optional axis hints; resolved against the dataset at render time. */
  x_col: z.string().optional(),
  y_cols: z.array(z.string()).optional(),
  title: z.string().optional(),
  /** Cached AI explanation for the current chart configuration. */
  ai_rationale: z.string().optional(),
  /** Bar charts: stacked columns vs grouped (clustered). Default grouped. */
  stacked: z.boolean().optional(),
  grouped: z.boolean().optional(),
  /** Per-slide chart color override (hex without #). */
  colors: z.array(z.string()).optional(),
});

export const slideImageSchema = z.object({
  source: z.enum(["upload", "ai"]).default("upload"),
  /** Runtime / legacy inline storage; stripped to IndexedDB on save when large. */
  dataUrl: z.string().optional(),
  /** IndexedDB key suffix (e.g. slide-0) when dataUrl is externalized. */
  imageRef: z.string().optional(),
  placement: z.enum(["right", "inline", "hero"]).default("right"),
  alt: z.string().optional(),
  /** Stored when source === "ai" — used for Regenerate. */
  prompt: z.string().optional(),
});

export const kpiSchema = z.object({
  label: z.string(),
  value: z.string(),
  /** Optional change indicator, e.g. "+34% YoY". */
  delta: z.string().optional(),
  description: z.string().optional(),
});

export const tableDataSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  /** Set when the source has more rows than displayed (PRD: max 8 shown). */
  truncated: z.boolean().optional(),
});

export const comparisonColumnSchema = z.object({
  heading: z.string(),
  points: z.array(z.string()),
});

export const comparisonSchema = z.object({
  left: comparisonColumnSchema,
  right: comparisonColumnSchema,
});

export const quoteSchema = z.object({
  text: z.string(),
  attribution: z.string().optional(),
});

export const timelineItemSchema = z.object({
  label: z.string(),
  title: z.string(),
  description: z.string().optional(),
});

/** Inch-based box override for preview drag/resize (matches lib/layout Box). */
export const layoutBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

/* ----------------------------------------------------------------------------
 * Slide + manifest
 * ------------------------------------------------------------------------- */

export const slideSchema = z.object({
  index: z.number().int().nonnegative(),
  type: slideTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  /** Bullet or prose body lines. */
  body: z.array(z.string()).default([]),
  speaker_notes: z.string().default(""),
  layout_hint: layoutHintSchema.default("standard"),

  // Type-specific payloads (all optional; presence depends on `type`).
  chart: chartSpecSchema.nullable().default(null),
  kpis: z.array(kpiSchema).optional(),
  table: tableDataSchema.optional(),
  comparison: comparisonSchema.optional(),
  quote: quoteSchema.optional(),
  timeline: z.array(timelineItemSchema).optional(),

  /** Marks AI-generated insight callouts so the UI can offer edit/delete. */
  is_insight: z.boolean().optional(),

  /** Remix and single-slide regenerate skip locked slides. */
  locked: z.boolean().optional(),

  /** Optional per-slide image (upload). */
  image: slideImageSchema.nullable().optional(),

  /** Per-element position overrides in inches (title, body, image, …). */
  element_boxes: z.record(z.string(), layoutBoxSchema).optional(),
});

export const slideManifestSchema = z.object({
  title: z.string(),
  /** Theme id (see lib/themes.ts). */
  theme: z.string(),
  language: z.string().default("en"),
  /** Right-to-left text direction (Arabic, Hebrew, Persian). */
  rtl: z.boolean().optional(),
  tone: toneSchema.optional(),
  audience: audienceSchema.optional(),
  slides: z.array(slideSchema).min(1),
});

export const anomalyKindSchema = z.enum(["outlier", "drop", "spike", "zero"]);

export const anomalyFlagSchema = z.object({
  id: z.string(),
  sheet: z.string(),
  column: z.string(),
  rowIndex: z.number().int().nonnegative(),
  xLabel: z.string(),
  message: z.string(),
  kind: anomalyKindSchema,
});

export const extractedSlideStructureSchema = z.object({
  index: z.number().int().positive(),
  inferredType: z.string(),
  title: z.string(),
  bodyPreview: z.array(z.string()),
  hasChart: z.boolean(),
});

export const deckStructureSchema = z.object({
  fileName: z.string(),
  slideCount: z.number().int().nonnegative(),
  slides: z.array(extractedSlideStructureSchema),
});

/* ----------------------------------------------------------------------------
 * Data parsing / chart recommendation contracts
 * ------------------------------------------------------------------------- */

export const COLUMN_TYPES = [
  "string",
  "number",
  "date",
  "boolean",
] as const;
export const columnTypeSchema = z.enum(COLUMN_TYPES);

export const parsedColumnSchema = z.object({
  name: z.string(),
  type: columnTypeSchema,
});

export const parsedSheetSchema = z.object({
  name: z.string(),
  columns: z.array(parsedColumnSchema),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.null()]))),
  rowCount: z.number().int().nonnegative(),
});

export const parsedDataSchema = z.object({
  sheets: z.array(parsedSheetSchema),
  source: z.enum(["xlsx", "xls", "csv", "pdf", "ai"]),
  fileName: z.string(),
});

export const chartRecommendationSchema = z.object({
  sheet: z.string(),
  x_col: z.string(),
  y_col: z.string(),
  chart_type: chartTypeSchema,
  rationale: z.string(),
});

export const chartRecommendationsSchema = z.object({
  recommendations: z.array(chartRecommendationSchema),
});

/** Single AI chart suggestion for preview editing (Phase 5). */
export const chartSuggestionSchema = z.object({
  sheet: z.string(),
  x_col: z.string(),
  y_col: z.string(),
  chart_type: chartTypeSchema,
  rationale: z.string(),
});
