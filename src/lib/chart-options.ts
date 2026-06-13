import { CHART_TYPES } from "@/lib/schema";
import { resolveChartData } from "@/lib/chart-data";
import type { ChartSpec, ChartType, ParsedData, ParsedSheet } from "@/lib/types";

const CHART_LABELS: Record<ChartType, string> = {
  bar: "Bar",
  line: "Line",
  area: "Area",
  pie: "Pie",
  donut: "Donut",
  scatter: "Scatter",
  combo: "Combo",
};

export function chartTypeLabel(type: ChartType): string {
  return CHART_LABELS[type];
}

export function findSheet(data: ParsedData, ref: string | null): ParsedSheet | null {
  if (data.sheets.length === 0) return null;
  if (!ref) return data.sheets[0];
  return (
    data.sheets.find((s) => s.name.toLowerCase() === ref.toLowerCase()) ??
    data.sheets[0]
  );
}

export function sheetColumnNames(sheet: ParsedSheet): string[] {
  return sheet.columns.map((c) => c.name);
}

function columnLooksNumeric(sheet: ParsedSheet, colIndex: number): boolean {
  const vals = sheet.rows
    .map((r) => r[colIndex])
    .filter((v) => v !== null && v !== "");
  if (vals.length < 2) return false;
  const numeric = vals.filter((v) => {
    const s = String(v).trim().replace(/,/g, "").replace(/%$/, "");
    return s !== "" && !Number.isNaN(Number(s)) && /\d/.test(s);
  }).length;
  return numeric / vals.length >= 0.8;
}

export function numericColumns(sheet: ParsedSheet): string[] {
  const typed = sheet.columns
    .filter((c) => c.type === "number")
    .map((c) => c.name);
  if (typed.length) return typed;
  return sheet.columns
    .filter((_, i) => columnLooksNumeric(sheet, i))
    .map((c) => c.name);
}

export function categoryColumns(sheet: ParsedSheet): string[] {
  return sheet.columns.filter((c) => c.type !== "number").map((c) => c.name);
}

/**
 * Chart types that make sense for the current spec + data.
 * Pie/donut require a single series; scatter needs numeric-friendly x.
 */
export function allowedChartTypes(
  chart: ChartSpec,
  data: ParsedData | null | undefined
): ChartType[] {
  if (!data) return [...CHART_TYPES];
  const resolved = resolveChartData(chart, data);
  if (!resolved) return ["bar", "line", "area"];

  const seriesCount = resolved.series.length;
  const pointCount = resolved.labels.length;
  const sheet = findSheet(data, chart.data_ref);
  const xCol = chart.x_col ?? sheet?.columns[0]?.name;
  const xIsNumeric =
    sheet?.columns.find((c) => c.name === xCol)?.type === "number";

  let allowed: ChartType[] = [...CHART_TYPES];

  if (seriesCount > 1) {
    allowed = allowed.filter((t) => t !== "pie" && t !== "donut");
  }
  if (pointCount < 2) {
    allowed = allowed.filter((t) => t !== "line" && t !== "area");
  }
  if (!xIsNumeric) {
    allowed = allowed.filter((t) => t !== "scatter");
  }
  if (pointCount > 12 && seriesCount === 1) {
    // pie still ok for small slices; prefer bar for many categories
    allowed = allowed.filter((t) => t !== "pie" && t !== "donut");
  }

  return allowed.length > 0 ? allowed : ["bar"];
}

export function isChartTypeAllowed(
  type: ChartType,
  chart: ChartSpec,
  data: ParsedData | null | undefined
): boolean {
  return allowedChartTypes(chart, data).includes(type);
}

/** Sensible default chart spec for the first sheet in a dataset. */
export function defaultChartSpec(data: ParsedData): ChartSpec | null {
  const sheet = data.sheets[0];
  const nums = numericColumns(sheet);
  const yCol = nums[0];
  if (!yCol) return null;

  const cats = categoryColumns(sheet);
  const xCol = cats[0] ?? sheet.columns[0]?.name ?? "Category";

  return {
    type: "bar",
    data_ref: sheet.name,
    x_col: xCol,
    y_cols: [yCol],
  };
}
