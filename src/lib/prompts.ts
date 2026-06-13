import "server-only";
import type {
  ChartRecommendation,
  DeckStructure,
  ParsedData,
  Slide,
  SlideManifest,
} from "@/lib/types";

/**
 * Prompt builders. Wording follows PRD Section 14; the JSON schema description
 * is injected so the model returns output that matches lib/schema.ts.
 */

/** Human-readable description of the slide manifest schema for the model. */
const SLIDE_SCHEMA_DOC = `
Return a JSON object with this exact shape:
{
  "title": string,                       // deck title
  "theme": string,                       // echo back the provided theme id
  "language": string,                    // ISO code, e.g. "en"
  "slides": [
    {
      "index": number,                   // 1-based position
      "type": "title" | "divider" | "content" | "chart" | "kpi" | "table" | "comparison" | "quote" | "timeline" | "closing",
      "title": string,
      "subtitle"?: string,
      "body": string[],                  // bullet points or short prose lines (omit/empty for title/divider)
      "speaker_notes": string,           // 2-4 sentences of speaking notes
      "layout_hint": "hero" | "two_col" | "grid_2x2" | "full_bleed" | "standard",
      "chart": null | { "type": "bar"|"line"|"area"|"pie"|"donut"|"scatter"|"combo", "data_ref": string|null, "x_col"?: string, "y_cols"?: string[], "title"?: string, "ai_rationale"?: string },
      "kpis"?: [ { "label": string, "value": string, "delta"?: string, "description"?: string } ],
      "comparison"?: { "left": { "heading": string, "points": string[] }, "right": { "heading": string, "points": string[] } },
      "quote"?: { "text": string, "attribution"?: string },
      "timeline"?: [ { "label": string, "title": string, "description"?: string } ]
    }
  ]
}
Use "kpi" type with a "kpis" array (2-4 items) for stat slides.
Use "comparison" type with a "comparison" object for A-vs-B slides.
Use "quote" type with a "quote" object. Use "timeline" type with a "timeline" array.
Only include type-specific fields that match the slide's type.
`.trim();

export interface OutlinePromptInput {
  description: string;
  slideCount: number;
  tone: string;
  audience: string;
  language: string;
  theme: string;
  /** Present in data / combined modes. */
  data?: ParsedData | null;
  /** Optional (user-overridable) chart suggestions to honor. */
  recommendations?: ChartRecommendation[] | null;
  /** Optional structure from a competitor / template .pptx. */
  structureSkeleton?: DeckStructure | null;
}

export function buildOutlineSystemPrompt(maxSlides: number): string {
  return [
    "You are a presentation architect. Given a description, generate a JSON slide manifest.",
    "Return ONLY valid JSON — no markdown, no explanation, no backticks.",
    "Follow this schema exactly:",
    SLIDE_SCHEMA_DOC,
    `Never generate more than ${maxSlides} slides. Always include a title slide first and a closing slide last.`,
    "Write substantive, specific content — avoid filler. Speaker notes must add value beyond the bullets.",
  ].join("\n\n");
}

/** Compact representation of parsed data for inclusion in a prompt. */
function summarizeData(data: ParsedData): string {
  const sheets = data.sheets
    .map((sheet) => {
      const cols = sheet.columns
        .map((c) => `${c.name} (${c.type})`)
        .join(", ");
      const sample = sheet.rows
        .slice(0, 10)
        .map((r) => JSON.stringify(r))
        .join("\n");
      return `Sheet "${sheet.name}" (${sheet.rowCount} rows)\nColumns: ${cols}\nSample rows:\n${sample}`;
    })
    .join("\n\n");
  return `The user also uploaded a data file "${data.fileName}".\n${sheets}\n\nWhere a slide visualizes this data, set type "chart", choose an appropriate chart type, and set "data_ref" to the sheet name with x_col/y_cols referencing real column names.`;
}

export function buildOutlineUserPrompt(input: OutlinePromptInput): string {
  const parts = [
    `Description: ${input.description || "(none provided)"}`,
    `Slide count target: ${input.slideCount}.`,
    `Tone: ${input.tone}. Audience: ${input.audience}. Language: ${input.language}.`,
    `Theme id (echo into "theme"): ${input.theme}.`,
  ];
  if (input.data && input.data.sheets.length > 0) {
    parts.push(summarizeData(input.data));
  }
  if (input.recommendations && input.recommendations.length > 0) {
    const recs = input.recommendations
      .map(
        (r) =>
          `- ${r.sheet}: ${r.chart_type} of "${r.y_col}" by "${r.x_col}" (${r.rationale})`
      )
      .join("\n");
    parts.push(
      `Use these chart choices for the data slides (set chart.type, data_ref=sheet, x_col, y_cols accordingly):\n${recs}`
    );
  }
  if (input.structureSkeleton && input.structureSkeleton.slides.length > 0) {
    const skeleton = input.structureSkeleton.slides
      .map(
        (s) =>
          `${s.index}. [${s.inferredType}] "${s.title}"${s.hasChart ? " (chart)" : ""}`
      )
      .join("\n");
    parts.push(
      `Match this deck structure from "${input.structureSkeleton.fileName}" (${input.structureSkeleton.slideCount} slides). Use the same slide count, types, and flow — replace placeholder titles with content from the user's description/data:\n${skeleton}`
    );
  }
  if (!input.data?.sheets.length) {
    parts.push(
      "No data file was uploaded. Include chart slides when the topic benefits from visuals. For each chart slide set data_ref to a short descriptive sheet name (e.g. \"Regional Revenue\"), and set x_col / y_cols to intended column names — sample data will be generated to match."
    );
  }
  return parts.join("\n");
}

/* ----------------------------------------------------------------------------
 * Synthetic chart data (description-only decks)
 * ------------------------------------------------------------------------- */

export const SYNTHETIC_DATA_SYSTEM_PROMPT = [
  "You are a data analyst creating plausible sample datasets for presentation charts.",
  "Return ONLY valid JSON with this exact shape:",
  '{ "sheets": [{ "name": string, "columns": [{ "name": string, "type": "string"|"number"|"boolean"|"date" }], "rows": [[ string | number | null, ... ]] }] }',
  "Generate realistic, internally consistent numbers aligned with slide titles and deck context.",
  "Each sheet should have 4–8 rows. Use the exact sheet and column names requested.",
  "Column types must match values (numbers for number columns).",
].join(" ");

export interface SyntheticDataPromptInput {
  description?: string;
  manifest?: SlideManifest;
  slide?: Slide;
}

export function buildSyntheticDataUserPrompt(input: SyntheticDataPromptInput): string {
  const parts: string[] = [];
  if (input.description?.trim()) {
    parts.push(`Deck description: ${input.description.trim()}`);
  }
  if (input.manifest?.title) {
    parts.push(`Deck title: ${input.manifest.title}`);
  }

  const chartNeeds: string[] = [];
  if (input.slide?.chart) {
    const ref = input.slide.chart.data_ref ?? input.slide.title;
    chartNeeds.push(
      `Sheet "${ref}" for slide "${input.slide.title}" (${input.slide.chart.type} chart, x_col="${input.slide.chart.x_col ?? "Category"}", y_cols=${JSON.stringify(input.slide.chart.y_cols ?? ["Value"])})`
    );
    if (input.slide.body?.length) {
      parts.push(`Slide bullets: ${input.slide.body.join("; ")}`);
    }
  } else if (input.manifest) {
    for (const s of input.manifest.slides) {
      if (s.type === "chart" && s.chart) {
        const ref = s.chart.data_ref ?? s.title;
        chartNeeds.push(
          `Sheet "${ref}" for "${s.title}" (${s.chart.type}, x_col="${s.chart.x_col ?? "Category"}", y_cols=${JSON.stringify(s.chart.y_cols ?? ["Value"])})`
        );
      }
    }
  }

  if (chartNeeds.length) {
    parts.push(
      `Generate data for these charts (use exact sheet names and column names):\n${chartNeeds.join("\n")}`
    );
  } else {
    parts.push(
      "Generate one sheet \"Chart Data\" with Category (string) and Value (number) columns and 5 plausible business rows."
    );
  }

  return parts.join("\n\n");
}

/* ----------------------------------------------------------------------------
 * Remix as different audience (PRD Section 7.4)
 * ------------------------------------------------------------------------- */

export const REMIX_TARGETS = [
  "executive_summary",
  "technical_deep_dive",
  "sales_pitch",
] as const;
export type RemixTarget = (typeof REMIX_TARGETS)[number];

const REMIX_INSTRUCTIONS: Record<RemixTarget, string> = {
  executive_summary:
    "Compress to ~5 slides: title, 3 key insight slides, closing. Strip jargon. Lead with outcomes and numbers. Audience: C-suite executives with 5 minutes.",
  technical_deep_dive:
    "Expand to ~15 slides with methodology, architecture, data tables, and detailed charts. Audience: engineers and technical stakeholders who need depth.",
  sales_pitch:
    "Reframe as a persuasive sales deck (~10 slides): problem, solution, proof points, ROI, competitive differentiation, strong closing ask. Audience: buyers and decision-makers.",
};

export function buildRemixSystemPrompt(maxSlides: number): string {
  return [
    "You are a presentation architect. Remix an existing slide manifest for a new audience or format.",
    "Return ONLY valid JSON — no markdown, no explanation.",
    "Follow this schema exactly:",
    SLIDE_SCHEMA_DOC,
    `Never generate more than ${maxSlides} slides. Preserve factual accuracy from the original — do not invent numbers.`,
    "Reframe tone and depth for the target audience. Keep theme and language from the original unless the instruction says otherwise.",
  ].join("\n\n");
}

export function buildRemixUserPrompt(
  manifest: SlideManifest,
  target: RemixTarget
): string {
  return [
    `Remix instruction: ${REMIX_INSTRUCTIONS[target]}`,
    `Original manifest:\n${JSON.stringify(manifest)}`,
  ].join("\n\n");
}

/* ----------------------------------------------------------------------------
 * Data chart recommendation (PRD Section 14)
 * ------------------------------------------------------------------------- */

export const CHART_RECOMMENDATION_SYSTEM_PROMPT = [
  "You are a data visualization expert. Given column metadata and sample rows,",
  "recommend chart types for each meaningful column pair. Return ONLY valid JSON.",
  'Schema: { "recommendations": [{ "sheet": string, "x_col": string, "y_col": string, "chart_type": "bar|line|pie|scatter|combo", "rationale": string }] }',
  "Prioritize clarity over variety. If in doubt, use bar charts.",
].join("\n");

export function buildChartRecommendationUserPrompt(data: ParsedData): string {
  return summarizeData(data);
}

/* ----------------------------------------------------------------------------
 * Single-chart AI suggestion (Phase 5)
 * ------------------------------------------------------------------------- */

export const SUGGEST_CHART_SYSTEM_PROMPT = [
  "You are a data visualization expert. Given column metadata, sample rows, and optional slide context,",
  "recommend the best chart type and axis columns for ONE chart.",
  "If a current chart configuration is provided and it is weak or suboptimal, explain why briefly and propose a better alternative.",
  "Return ONLY valid JSON with this exact shape:",
  '{ "sheet": string, "x_col": string, "y_col": string, "chart_type": "bar"|"line"|"area"|"pie"|"donut"|"scatter"|"combo", "rationale": string }',
  "Use only column names that exist in the provided data. x_col should be categorical; y_col must be numeric.",
  "Keep rationale to one concise sentence (max 25 words). Prefer clarity over variety.",
].join("\n");

export interface SuggestChartPromptInput {
  data: ParsedData;
  currentChart?: {
    type: string;
    data_ref?: string | null;
    x_col?: string;
    y_cols?: string[];
  } | null;
  slideTitle?: string;
  slideBody?: string[];
}

export function buildSuggestChartUserPrompt(input: SuggestChartPromptInput): string {
  const parts = [summarizeData(input.data)];
  if (input.slideTitle) parts.push(`Slide title: ${input.slideTitle}`);
  if (input.slideBody?.length) {
    parts.push(`Slide bullets:\n${input.slideBody.map((b) => `- ${b}`).join("\n")}`);
  }
  if (input.currentChart) {
    parts.push(`Current chart configuration:\n${JSON.stringify(input.currentChart)}`);
  } else {
    parts.push("No chart is configured yet — propose the best starting chart.");
  }
  return parts.join("\n\n");
}

/* ----------------------------------------------------------------------------
 * Natural-language chart edit (Phase 5)
 * ------------------------------------------------------------------------- */

export const EDIT_CHART_SYSTEM_PROMPT = [
  "You are a data visualization expert. Given a chart specification, dataset summary, and user instruction,",
  "return an updated chart spec object ONLY — no markdown, no explanation.",
  'Schema: { "type": "bar"|"line"|"area"|"pie"|"donut"|"scatter"|"combo", "data_ref": string|null, "x_col"?: string, "y_cols"?: string[], "title"?: string, "ai_rationale"?: string }',
  "Use only sheet and column names from the provided data. y_cols must reference numeric columns.",
  "Set ai_rationale to one sentence explaining what changed and why.",
].join("\n");

export function buildEditChartUserPrompt(
  chart: Record<string, unknown>,
  instruction: string,
  data: ParsedData
): string {
  return [
    `Instruction: ${instruction}`,
    `Current chart:\n${JSON.stringify(chart)}`,
    summarizeData(data),
  ].join("\n\n");
}

/* ----------------------------------------------------------------------------
 * Insight callout generation (PRD Section 14) — used in Phase 2
 * ------------------------------------------------------------------------- */

export const INSIGHT_SYSTEM_PROMPT = [
  "You are a data analyst writing for executives. Given this dataset summary,",
  "write 2-3 insight sentences as a JSON array of strings.",
  "Each insight must be specific, numeric where possible, and max 20 words.",
  "Return ONLY a JSON array. No explanation.",
].join("\n");

const SINGLE_SLIDE_SCHEMA_DOC = `
Return a single slide JSON object (not wrapped in a manifest):
{
  "index": number,
  "type": "title" | "divider" | "content" | "chart" | "kpi" | "table" | "comparison" | "quote" | "timeline" | "closing",
  "title": string,
  "subtitle"?: string,
  "body": string[],
  "speaker_notes": string,
  "layout_hint": "hero" | "two_col" | "grid_2x2" | "full_bleed" | "standard",
  "chart": null | { "type": string, "data_ref": string|null, "x_col"?: string, "y_cols"?: string[] },
  "kpis"?: [...], "comparison"?: {...}, "quote"?: {...}, "timeline"?: [...]
}
Only include fields appropriate for the slide type. Keep the same type unless the instruction requires changing it.
`.trim();

export function buildRegenerateSlideSystemPrompt(): string {
  return [
    "You are a presentation architect. Regenerate ONE slide based on the user's instruction.",
    "Return ONLY valid JSON for a single slide object — no markdown, no explanation.",
    SINGLE_SLIDE_SCHEMA_DOC,
    "Preserve factual accuracy. Apply the instruction while keeping content substantive.",
  ].join("\n\n");
}

export function buildRegenerateSlideUserPrompt(
  slide: Record<string, unknown>,
  instruction: string,
  context?: { deckTitle?: string; tone?: string; audience?: string }
): string {
  const parts = [
    `Instruction: ${instruction}`,
    `Current slide JSON:\n${JSON.stringify(slide)}`,
  ];
  if (context?.deckTitle) parts.push(`Deck title: ${context.deckTitle}`);
  if (context?.tone) parts.push(`Tone: ${context.tone}`);
  if (context?.audience) parts.push(`Audience: ${context.audience}`);
  return parts.join("\n\n");
}

export const PRESENTER_SCRIPT_SYSTEM_PROMPT = [
  "You are a speechwriter. Given slide titles and bullet speaker notes, rewrite each slide's notes",
  "into flowing spoken prose (2-4 sentences per slide). Return ONLY valid JSON:",
  '{ "sections": [{ "slide_number": number, "title": string, "script": string }] }',
  "Do not include bullet points in the script — write natural sentences a presenter would say aloud.",
].join("\n");

export function buildPresenterScriptUserPrompt(
  slides: { index: number; title: string; speaker_notes: string; body?: string[] }[]
): string {
  const lines = slides.map((s) =>
    `Slide ${s.index}: "${s.title}"\nBullets: ${(s.body ?? []).join("; ")}\nNotes: ${s.speaker_notes}`
  );
  return lines.join("\n\n");
}
