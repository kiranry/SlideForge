import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { ColumnType, ParsedData, ParsedSheet } from "@/lib/types";

const MAX_ROWS = 10_000;

type Cell = string | number | null;

function isBlankRow(row: Cell[]): boolean {
  return row.every((c) => c === null || c === "");
}

function detectType(values: Cell[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== null && v !== "");
  if (nonEmpty.length === 0) return "string";

  let nums = 0;
  let bools = 0;
  let dates = 0;
  for (const v of nonEmpty) {
    if (typeof v === "number" && Number.isFinite(v)) {
      nums++;
      continue;
    }
    const s = String(v).trim();
    if (/^-?[\d,]*\.?\d+%?$/.test(s)) nums++;
    else if (/^(true|false|yes|no)$/i.test(s)) bools++;
    else if (!Number.isNaN(Date.parse(s)) && /[-/:]/.test(s)) dates++;
  }
  const n = nonEmpty.length;
  if (nums / n >= 0.8) return "number";
  if (dates / n >= 0.8) return "date";
  if (bools / n >= 0.8) return "boolean";
  return "string";
}

function coerce(value: unknown): Cell {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const s = String(value).trim();
  const numeric = s.replace(/,/g, "").replace(/%$/, "");
  if (numeric !== "" && !Number.isNaN(Number(numeric)) && /\d/.test(numeric)) {
    return Number(numeric);
  }
  return s;
}

function buildSheet(name: string, matrix: Cell[][]): ParsedSheet | null {
  const rows = matrix.filter((r) => !isBlankRow(r));
  if (rows.length === 0) return null;

  const header = rows[0].map((h, i) => (h === null || h === "" ? `Column ${i + 1}` : String(h)));
  const bodyAll = rows.slice(1).map((r) => header.map((_, i) => coerce(r[i] ?? null)));
  const body = bodyAll.slice(0, MAX_ROWS);

  const columns = header.map((colName, i) => ({
    name: colName,
    type: detectType(body.map((r) => r[i])),
  }));

  return { name, columns, rows: body, rowCount: bodyAll.length };
}

export async function parseExcel(file: File): Promise<ParsedData> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheets: ParsedSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Cell[]>(ws, {
      header: 1,
      blankrows: false,
      defval: null,
    });
    const sheet = buildSheet(sheetName, matrix);
    if (sheet) sheets.push(sheet);
  }
  const source = file.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
  return { sheets, source, fileName: file.name };
}

export async function parseCsv(file: File): Promise<ParsedData> {
  const text = await file.text();
  const result = Papa.parse<Cell[]>(text, {
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const matrix = (result.data as unknown[][]).map((r) =>
    r.map((c) => (c === undefined ? null : (c as Cell)))
  );
  const sheet = buildSheet(file.name.replace(/\.csv$/i, ""), matrix);
  return {
    sheets: sheet ? [sheet] : [],
    source: "csv",
    fileName: file.name,
  };
}

/** Dispatch on file extension; PDFs are handled server-side. */
export async function parseFileClient(file: File): Promise<ParsedData> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".csv")) return parseCsv(file);
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return parseExcel(file);
  throw new Error("Unsupported file type for client parsing.");
}

const DATA_ACCEPT = /\.(xlsx|xls|csv|pdf)$/i;

/** Parse any supported data file (client or server for PDF). */
export async function parseDataFile(file: File): Promise<ParsedData> {
  if (!DATA_ACCEPT.test(file.name)) {
    throw new Error("Use Excel (.xlsx, .xls), CSV, or PDF.");
  }
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/parse-data", { method: "POST", body: form });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(error || "PDF parse failed");
    }
    const { data } = (await res.json()) as { data: ParsedData };
    return data;
  }
  return parseFileClient(file);
}
