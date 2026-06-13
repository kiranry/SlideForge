import type { ColumnType, ParsedColumn, ParsedData, ParsedSheet } from "@/lib/types";

interface RawSyntheticSheet {
  name?: string;
  columns?: { name?: string; type?: string }[];
  rows?: (string | number | null)[][];
}

function coerceColumnType(raw?: string): ColumnType {
  if (raw === "number" || raw === "boolean" || raw === "date") return raw;
  return "string";
}

function parseSheet(raw: RawSyntheticSheet, fallbackName: string): ParsedSheet | null {
  const name = (raw.name?.trim() || fallbackName).slice(0, 80);
  const columns: ParsedColumn[] =
    raw.columns?.length
      ? raw.columns.map((c, i) => ({
          name: (c.name?.trim() || `Column ${i + 1}`).slice(0, 60),
          type: coerceColumnType(c.type),
        }))
      : [
          { name: "Category", type: "string" },
          { name: "Value", type: "number" },
        ];

  const rows = (raw.rows ?? []).slice(0, 500).map((row) => {
    const padded = [...row];
    while (padded.length < columns.length) padded.push(null);
    return padded.slice(0, columns.length);
  });

  if (rows.length === 0) return null;

  return {
    name,
    columns,
    rows,
    rowCount: rows.length,
  };
}

/** Parse AI JSON into ParsedData; returns null when nothing usable. */
export function parseSyntheticDataResponse(
  parsed: unknown,
  fileName = "AI generated data"
): ParsedData | null {
  let sheets: RawSyntheticSheet[] = [];
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.sheets)) {
      sheets = obj.sheets as RawSyntheticSheet[];
    } else if (Array.isArray(parsed)) {
      sheets = parsed as RawSyntheticSheet[];
    }
  }

  const parsedSheets = sheets
    .map((s, i) => parseSheet(s, `Sheet ${i + 1}`))
    .filter((s): s is ParsedSheet => s !== null);

  if (!parsedSheets.length) return null;

  return {
    sheets: parsedSheets,
    source: "ai",
    fileName,
  };
}
