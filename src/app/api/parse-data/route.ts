import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import type { ColumnType, ParsedData, ParsedSheet } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (PRD Section 10)

function detectType(values: (string | number | null)[]): ColumnType {
  const nonEmpty = values.filter((v) => v !== null && v !== "");
  if (nonEmpty.length === 0) return "string";
  let nums = 0;
  for (const v of nonEmpty) {
    const s = String(v).replace(/,/g, "").replace(/%$/, "");
    if (s !== "" && !Number.isNaN(Number(s))) nums++;
  }
  return nums / nonEmpty.length >= 0.8 ? "number" : "string";
}

function coerce(s: string): string | number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = t.replace(/,/g, "").replace(/%$/, "");
  if (n !== "" && !Number.isNaN(Number(n)) && /\d/.test(n)) return Number(n);
  return t;
}

function tableToSheet(
  table: string[][],
  name: string
): ParsedSheet | null {
  if (table.length < 2) return null;

  const header = table[0].map((h, i) => h.trim() || `Column ${i + 1}`);
  const body = table.slice(1).map((r) =>
    header.map((_, i) => coerce(r[i] ?? ""))
  );
  const columns = header.map((colName, i) => ({
    name: colName,
    type: detectType(body.map((row) => row[i])),
  }));

  return { name, columns, rows: body, rowCount: body.length };
}

/** Fallback: split lines on runs of 2+ spaces/tabs when table detection fails. */
function extractTableFromText(text: string, fileName: string): ParsedSheet | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const rows = lines
    .map((l) => l.split(/\s{2,}|\t+/).map((c) => c.trim()))
    .filter((cells) => cells.length >= 2);

  if (rows.length < 2) return null;

  const counts = new Map<number, number>();
  rows.forEach((r) => counts.set(r.length, (counts.get(r.length) ?? 0) + 1));
  const width = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const tableRows = rows.filter((r) => r.length === width);
  if (tableRows.length < 2) return null;

  return tableToSheet(tableRows, fileName.replace(/\.pdf$/i, ""));
}

export async function POST(req: NextRequest) {
  let file: File | null = null;
  try {
    const form = await req.formData();
    file = form.get("file") as File | null;
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit." }, { status: 413 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      { error: "This endpoint only handles PDFs. Parse Excel/CSV in the browser." },
      { status: 400 }
    );
  }

  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
  try {
    const tableResult = await parser.getTable();
    const sheets: ParsedSheet[] = [];

    for (const page of tableResult.pages) {
      page.tables.forEach((table, i) => {
        const sheet = tableToSheet(
          table,
          `${file!.name.replace(/\.pdf$/i, "")} p${page.num}${page.tables.length > 1 ? ` t${i + 1}` : ""}`
        );
        if (sheet) sheets.push(sheet);
      });
    }

    if (sheets.length === 0 && tableResult.mergedTables.length > 0) {
      tableResult.mergedTables.forEach((table, i) => {
        const sheet = tableToSheet(
          table,
          `${file!.name.replace(/\.pdf$/i, "")} table ${i + 1}`
        );
        if (sheet) sheets.push(sheet);
      });
    }

    if (sheets.length === 0) {
      const textResult = await parser.getText();
      const sheet = extractTableFromText(textResult.text, file.name);
      if (sheet) sheets.push(sheet);
    }

    const data: ParsedData = {
      sheets,
      source: "pdf",
      fileName: file.name,
    };

    if (data.sheets.length === 0) {
      return NextResponse.json(
        { error: "Could not detect a table in this PDF." },
        { status: 422 }
      );
    }
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to parse PDF." },
      { status: 500 }
    );
  } finally {
    await parser.destroy();
  }
}
