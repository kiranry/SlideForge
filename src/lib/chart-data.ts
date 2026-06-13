import type { ChartSpec, ParsedData, ParsedSheet } from "@/lib/types";

export interface ResolvedChart {
  labels: string[];
  series: { name: string; values: number[] }[];
}

function findSheet(data: ParsedData, ref: string | null): ParsedSheet | null {
  if (data.sheets.length === 0) return null;
  if (!ref) return data.sheets[0];
  return (
    data.sheets.find((s) => s.name.toLowerCase() === ref.toLowerCase()) ??
    data.sheets[0]
  );
}

function colIndex(sheet: ParsedSheet, name?: string): number {
  if (!name) return -1;
  return sheet.columns.findIndex(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
}

const MAX_POINTS = 500;

/**
 * Resolve a slide's chart spec against parsed data into chart-ready arrays.
 * Returns null when the chart cannot be built. Shared by the pptx renderer and
 * the HTML preview so both draw identical charts.
 */
export function resolveChartData(
  chart: ChartSpec,
  data: ParsedData
): ResolvedChart | null {
  const sheet = findSheet(data, chart.data_ref);
  if (!sheet) return null;

  // X / category column: explicit, else first non-numeric, else first column.
  let xIdx = colIndex(sheet, chart.x_col);
  if (xIdx === -1) {
    xIdx = sheet.columns.findIndex((c) => c.type !== "number");
    if (xIdx === -1) xIdx = 0;
  }

  // Y columns: explicit, else all numeric columns except X.
  let yIdxs: number[] = [];
  if (chart.y_cols && chart.y_cols.length > 0) {
    yIdxs = chart.y_cols.map((c) => colIndex(sheet, c)).filter((i) => i >= 0);
  }
  if (yIdxs.length === 0) {
    yIdxs = sheet.columns
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => c.type === "number" && i !== xIdx)
      .map(({ i }) => i);
  }
  if (yIdxs.length === 0) return null;

  const rows = sheet.rows.slice(0, MAX_POINTS);
  const labels = rows.map((r) => String(r[xIdx] ?? ""));
  const series = yIdxs.map((yi) => ({
    name: sheet.columns[yi]?.name ?? `Series ${yi}`,
    values: rows.map((r) => {
      const v = r[yi];
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    }),
  }));

  return { labels, series };
}
