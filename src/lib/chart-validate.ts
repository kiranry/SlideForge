import { chartSpecSchema, chartSuggestionSchema } from "@/lib/schema";
import { extractJson } from "@/lib/manifest";
import { findSheet, numericColumns, sheetColumnNames } from "@/lib/chart-options";
import type { ChartSpec, ParsedData } from "@/lib/types";
import type { z } from "zod";

export type ChartSuggestion = z.infer<typeof chartSuggestionSchema>;

export interface ChartResult {
  ok: boolean;
  chart?: ChartSpec;
  error?: string;
}

export function parseChartSuggestion(raw: string): {
  ok: boolean;
  suggestion?: ChartSuggestion;
  error?: string;
} {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  const parsed = chartSuggestionSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  return { ok: true, suggestion: parsed.data };
}

/** Ensure AI suggestion references real sheets/columns; coerce to ChartSpec. */
export function suggestionToChartSpec(
  suggestion: ChartSuggestion,
  data: ParsedData
): ChartResult {
  const sheet = findSheet(data, suggestion.sheet);
  if (!sheet) {
    return { ok: false, error: `Sheet "${suggestion.sheet}" not found in data.` };
  }

  const cols = sheetColumnNames(sheet);
  const nums = numericColumns(sheet);

  const xCol = cols.includes(suggestion.x_col)
    ? suggestion.x_col
    : cols.find((c) => c !== suggestion.y_col) ?? cols[0];
  const yCol = nums.includes(suggestion.y_col)
    ? suggestion.y_col
    : nums[0];

  if (!xCol || !yCol) {
    return { ok: false, error: "Could not resolve valid x/y columns from suggestion." };
  }

  const chart: ChartSpec = {
    type: suggestion.chart_type,
    data_ref: sheet.name,
    x_col: xCol,
    y_cols: [yCol],
    ai_rationale: suggestion.rationale,
  };

  const validated = chartSpecSchema.safeParse(chart);
  if (!validated.success) {
    return { ok: false, error: validated.error.message };
  }

  return { ok: true, chart: validated.data };
}

export function parseChartSpec(raw: string): ChartResult {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }
  const parsed = chartSpecSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }
  return { ok: true, chart: parsed.data };
}

/** Validate chart columns exist in the attached dataset. */
export function chartFitsData(chart: ChartSpec, data: ParsedData): boolean {
  const sheet = findSheet(data, chart.data_ref);
  if (!sheet) return false;
  const cols = sheetColumnNames(sheet);
  const nums = numericColumns(sheet);
  const xOk = !chart.x_col || cols.includes(chart.x_col);
  const yOk = !chart.y_cols?.length || chart.y_cols.every((y) => nums.includes(y));
  return xOk && yOk;
}
