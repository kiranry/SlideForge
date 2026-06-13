import type { ParsedData, ParsedSheet } from "@/lib/types";

/** Default editable grid for charts when no file is uploaded. */
export function createBlankChartData(sheetName = "Chart Data"): ParsedData {
  const sheet: ParsedSheet = {
    name: sheetName,
    columns: [
      { name: "Category", type: "string" },
      { name: "Value", type: "number" },
    ],
    rows: [
      ["Item A", 42],
      ["Item B", 58],
      ["Item C", 35],
      ["Item D", 71],
    ],
    rowCount: 4,
  };
  return {
    sheets: [sheet],
    source: "csv",
    fileName: "Manual entry",
  };
}

export function mergeSheetIntoData(data: ParsedData, sheet: ParsedSheet): ParsedData {
  const idx = data.sheets.findIndex(
    (s) => s.name.toLowerCase() === sheet.name.toLowerCase()
  );
  if (idx >= 0) {
    const sheets = [...data.sheets];
    sheets[idx] = sheet;
    return { ...data, sheets };
  }
  return { ...data, sheets: [...data.sheets, sheet] };
}

export function mergeParsedData(base: ParsedData, extra: ParsedData): ParsedData {
  let merged = { ...base, sheets: [...base.sheets] };
  for (const sheet of extra.sheets) {
    merged = mergeSheetIntoData(merged, sheet);
  }
  return merged;
}
