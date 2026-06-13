import Papa from "papaparse";
import type { ParsedData } from "@/lib/types";

function safeSheetFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 40) || "sheet";
}

/** Convert parsed data to CSV file map for bundle export. */
export function parsedDataToCsvFiles(data: ParsedData): Record<string, string> {
  const files: Record<string, string> = {};

  for (const sheet of data.sheets) {
    const header = sheet.columns.map((c) => c.name);
    const rows = sheet.rows.map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))
    );
    const csv = Papa.unparse([header, ...rows]);
    const key = `source-data-${safeSheetFileName(sheet.name)}.csv`;
    files[key] = csv;
  }

  if (data.sheets.length === 1) {
    const first = Object.values(files)[0];
    if (first) files["source-data.csv"] = first;
  } else if (data.sheets.length > 1) {
    const combined = data.sheets
      .map((s) => `### ${s.name}\n${files[`source-data-${safeSheetFileName(s.name)}.csv`]}`)
      .join("\n\n");
    files["source-data.csv"] = combined;
  }

  return files;
}
