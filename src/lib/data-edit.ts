import type { ColumnType, ParsedData } from "@/lib/types";

/** Max rows stored/editable in deck data (Phase 7). */
export const MAX_DECK_DATA_ROWS = 500;

export function coerceCellValue(
  raw: string,
  type?: ColumnType
): string | number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (type === "number") {
    const n = Number(trimmed.replace(/,/g, "").replace(/%$/, ""));
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === "boolean") {
    return /^(true|yes|1)$/i.test(trimmed) ? "true" : "false";
  }
  return trimmed;
}

/** Immutably update one cell in a parsed dataset. */
export function patchDataCell(
  data: ParsedData,
  sheetName: string,
  rowIndex: number,
  colIndex: number,
  rawValue: string
): ParsedData {
  return {
    ...data,
    sheets: data.sheets.map((sheet) => {
      if (sheet.name !== sheetName) return sheet;
      const colType = sheet.columns[colIndex]?.type;
      const rows = sheet.rows.map((row, ri) => {
        if (ri !== rowIndex) return row;
        const next = [...row];
        next[colIndex] = coerceCellValue(rawValue, colType);
        return next;
      });
      return { ...sheet, rows };
    }),
  };
}

export function dataExceedsDeckLimit(data: ParsedData): boolean {
  return data.sheets.some(
    (s) => s.rowCount > MAX_DECK_DATA_ROWS || s.rows.length > MAX_DECK_DATA_ROWS
  );
}
