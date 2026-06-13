import type { AnomalyFlag, ParsedData, ParsedSheet } from "@/lib/types";

function uid(): string {
  return `a-${Math.random().toString(36).slice(2, 9)}`;
}

function numericValues(
  sheet: ParsedSheet,
  colName: string
): { index: number; label: string; value: number }[] {
  const colIdx = sheet.columns.findIndex((c) => c.name === colName);
  if (colIdx < 0) return [];
  const xCol = sheet.columns[0]?.name;
  const out: { index: number; label: string; value: number }[] = [];
  sheet.rows.forEach((row, i) => {
    const v = row[colIdx];
    if (typeof v === "number" && Number.isFinite(v)) {
      const label =
        xCol && row[sheet.columns.findIndex((c) => c.name === xCol)] != null
          ? String(row[sheet.columns.findIndex((c) => c.name === xCol)])
          : `Row ${i + 1}`;
      out.push({ index: i, label, value: v });
    }
  });
  return out;
}

/** IQR-based outlier detection on numeric series. */
function findOutliers(
  sheet: ParsedSheet,
  colName: string
): AnomalyFlag[] {
  const points = numericValues(sheet, colName);
  if (points.length < 4) return [];

  const values = points.map((p) => p.value).sort((a, b) => a - b);
  const q1 = values[Math.floor(values.length * 0.25)];
  const q3 = values[Math.floor(values.length * 0.75)];
  const iqr = q3 - q1;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;

  return points
    .filter((p) => p.value < low || p.value > high)
    .map((p) => ({
      id: uid(),
      sheet: sheet.name,
      column: colName,
      rowIndex: p.index,
      xLabel: p.label,
      message: `Outlier: ${p.label} = ${p.value}`,
      kind: "outlier" as const,
    }));
}

/** Sudden drops or spikes between consecutive points (>40% change). */
function findSuddenChanges(
  sheet: ParsedSheet,
  colName: string
): AnomalyFlag[] {
  const points = numericValues(sheet, colName);
  const flags: AnomalyFlag[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].value;
    const curr = points[i].value;
    if (prev === 0) continue;
    const pct = ((curr - prev) / prev) * 100;
    if (pct <= -40) {
      flags.push({
        id: uid(),
        sheet: sheet.name,
        column: colName,
        rowIndex: points[i].index,
        xLabel: points[i].label,
        message: `⚠️ Dip in ${points[i].label} (${pct.toFixed(0)}%) — check source data`,
        kind: "drop",
      });
    } else if (pct >= 80) {
      flags.push({
        id: uid(),
        sheet: sheet.name,
        column: colName,
        rowIndex: points[i].index,
        xLabel: points[i].label,
        message: `Spike in ${points[i].label} (+${pct.toFixed(0)}%)`,
        kind: "spike",
      });
    }
  }
  return flags;
}

/** Zero values in numeric columns that are otherwise non-zero. */
function findZeros(sheet: ParsedSheet, colName: string): AnomalyFlag[] {
  const colIdx = sheet.columns.findIndex((c) => c.name === colName);
  if (colIdx < 0) return [];
  const points = numericValues(sheet, colName);
  const nonZero = points.filter((p) => p.value !== 0).length;
  if (nonZero === 0) return [];

  return points
    .filter((p) => p.value === 0)
    .map((p) => ({
      id: uid(),
      sheet: sheet.name,
      column: colName,
      rowIndex: p.index,
      xLabel: p.label,
      message: `Zero value in ${p.label} for ${colName}`,
      kind: "zero",
    }));
}

/** Scan all numeric columns across sheets for statistical anomalies. */
export function detectAnomalies(data: ParsedData): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];
  for (const sheet of data.sheets) {
    for (const col of sheet.columns) {
      if (col.type !== "number") continue;
      flags.push(...findOutliers(sheet, col.name));
      flags.push(...findSuddenChanges(sheet, col.name));
      flags.push(...findZeros(sheet, col.name));
    }
  }
  // De-dupe by message
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.sheet}:${f.column}:${f.xLabel}:${f.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Anomalies relevant to a chart slide (by sheet + y column). */
export function anomaliesForChart(
  flags: AnomalyFlag[],
  sheetName: string | null | undefined,
  yCol: string | undefined,
  suppressed: string[] = []
): AnomalyFlag[] {
  if (!sheetName) return [];
  return flags.filter(
    (f) =>
      !suppressed.includes(f.id) &&
      f.sheet === sheetName &&
      (yCol ? f.column === yCol : true)
  );
}
