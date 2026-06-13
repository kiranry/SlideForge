import { fuzzyMatchColumn, fuzzyMatchSheet } from "@/lib/column-fuzzy";
import type {
  ApplyTemplateOptions,
  ApplyTemplateResult,
  BindingIssue,
  SavedDeckTemplate,
  TemplateBinding,
} from "@/lib/templates/saved-template";
import type {
  ParsedData,
  ParsedSheet,
  Slide,
  SlideManifest,
  StoredDeck,
  TableData,
} from "@/lib/types";

const MAX_TABLE_ROWS = 8;

function findSheet(data: ParsedData, name: string): ParsedSheet | null {
  const lower = name.toLowerCase();
  return (
    data.sheets.find((s) => s.name.toLowerCase() === lower) ??
    data.sheets.find((s) => s.name === name) ??
    null
  );
}

function resolveName(
  expected: string,
  candidates: string[],
  mappings?: Record<string, string>
): string | null {
  if (mappings?.[expected]) {
    const mapped = mappings[expected];
    if (candidates.some((c) => c === mapped)) return mapped;
  }
  return fuzzyMatchColumn(expected, candidates);
}

function resolveSheetName(
  expected: string,
  data: ParsedData,
  mappings?: Record<string, string>
): string | null {
  const names = data.sheets.map((s) => s.name);
  if (mappings?.[expected] && names.includes(mappings[expected])) {
    return mappings[expected];
  }
  return fuzzyMatchSheet(expected, names);
}

function rebuildTable(
  sheet: ParsedSheet,
  columnNames: string[],
  columnMappings?: Record<string, string>
): TableData {
  const resolvedCols = columnNames.map(
    (c) => resolveName(c, sheet.columns.map((col) => col.name), columnMappings) ?? c
  );
  const colIdxs = resolvedCols.map((c) =>
    sheet.columns.findIndex((col) => col.name === c)
  );

  const rows = sheet.rows.slice(0, MAX_TABLE_ROWS).map((row) =>
    colIdxs.map((idx) => String(idx >= 0 ? row[idx] ?? "" : ""))
  );

  return {
    columns: columnNames,
    rows,
    truncated: sheet.rows.length > MAX_TABLE_ROWS,
  };
}

function applyBindingToSlide(
  slide: Slide,
  binding: TemplateBinding,
  data: ParsedData,
  columnMappings?: Record<string, string>,
  sheetMappings?: Record<string, string>
): Slide {
  const sheetName = resolveSheetName(binding.sheet, data, sheetMappings);
  if (!sheetName) return slide;
  const sheet = findSheet(data, sheetName);
  if (!sheet) return slide;

  const colNames = sheet.columns.map((c) => c.name);

  if (binding.chart && slide.chart) {
    const x_col =
      resolveName(binding.chart.x_col, colNames, columnMappings) ??
      binding.chart.x_col;
    const y_cols = binding.chart.y_cols.map(
      (y) => resolveName(y, colNames, columnMappings) ?? y
    );
    return {
      ...slide,
      chart: {
        ...slide.chart,
        type: binding.chart.type,
        data_ref: sheet.name,
        x_col,
        y_cols,
      },
    };
  }

  if (binding.table && slide.table) {
    return {
      ...slide,
      table: rebuildTable(sheet, binding.table.columns, columnMappings),
    };
  }

  return slide;
}

function collectBindingIssues(
  bindings: TemplateBinding[],
  data: ParsedData,
  columnMappings?: Record<string, string>,
  sheetMappings?: Record<string, string>
): BindingIssue[] {
  const issues: BindingIssue[] = [];
  const sheetNames = data.sheets.map((s) => s.name);

  for (const binding of bindings) {
    const sheetName = resolveSheetName(binding.sheet, data, sheetMappings);
    if (!sheetName) {
      issues.push({
        slideIndex: binding.slideIndex,
        field: "sheet",
        expected: binding.sheet,
        suggestions: sheetNames,
      });
      continue;
    }
    const sheet = findSheet(data, sheetName);
    if (!sheet) continue;
    const colNames = sheet.columns.map((c) => c.name);

    if (binding.chart) {
      const x = resolveName(
        binding.chart.x_col,
        colNames,
        columnMappings
      );
      if (!x || !colNames.includes(x)) {
        issues.push({
          slideIndex: binding.slideIndex,
          field: "chart.x_col",
          expected: binding.chart.x_col,
          suggestions: colNames,
        });
      }
      for (const y of binding.chart.y_cols) {
        const resolved = resolveName(y, colNames, columnMappings);
        if (!resolved || !colNames.includes(resolved)) {
          issues.push({
            slideIndex: binding.slideIndex,
            field: `chart.y_col:${y}`,
            expected: y,
            suggestions: colNames,
          });
        }
      }
    }

    if (binding.table) {
      for (const col of binding.table.columns) {
        const resolved = resolveName(col, colNames, columnMappings);
        if (!resolved || !colNames.includes(resolved)) {
          issues.push({
            slideIndex: binding.slideIndex,
            field: `table.col:${col}`,
            expected: col,
            suggestions: colNames,
          });
        }
      }
    }
  }

  return issues;
}

/** Apply a saved template to new parsed data, refreshing chart/table bindings. */
export function applyTemplateToData(
  options: ApplyTemplateOptions
): ApplyTemplateResult {
  const { template, data, columnMappings, sheetMappings } = options;
  const base = template.skeletonManifest;
  if (!base) {
    throw new Error("Template has no skeleton manifest.");
  }

  const slides: Slide[] = JSON.parse(JSON.stringify(base.slides)) as Slide[];
  const bindings = template.bindings ?? [];

  const issues = collectBindingIssues(
    bindings,
    data,
    columnMappings,
    sheetMappings
  );

  for (const binding of bindings) {
    const idx = binding.slideIndex;
    if (idx < 0 || idx >= slides.length) continue;
    slides[idx] = applyBindingToSlide(
      slides[idx],
      binding,
      data,
      columnMappings,
      sheetMappings
    );
  }

  const manifest: SlideManifest = {
    ...base,
    theme: template.theme,
    tone: template.tone ?? base.tone,
    audience: template.audience ?? base.audience,
    slides: slides.map((s, i) => ({ ...s, index: i + 1 })),
  };

  return { manifest, issues };
}

/** Extract data bindings from a manifest for Weekly Report templates. */
export function extractBindings(
  manifest: SlideManifest,
  data?: ParsedData | null
): TemplateBinding[] {
  const bindings: TemplateBinding[] = [];
  const defaultSheet = data?.sheets[0]?.name ?? "";

  manifest.slides.forEach((slide, slideIndex) => {
    if (slide.type === "chart" && slide.chart) {
      bindings.push({
        slideIndex,
        sheet: slide.chart.data_ref ?? defaultSheet,
        chart: {
          x_col: slide.chart.x_col ?? "",
          y_cols: slide.chart.y_cols ?? [],
          type: slide.chart.type,
        },
      });
    }
    if (slide.type === "table" && slide.table) {
      bindings.push({
        slideIndex,
        sheet: defaultSheet,
        table: { columns: [...slide.table.columns] },
      });
    }
  });

  return bindings;
}

/** Build a SavedDeckTemplate from an existing deck. */
export function createTemplateFromDeck(
  deck: StoredDeck,
  name: string,
  kind: "weekly_report" | "skeleton"
): SavedDeckTemplate {
  const manifest = deck.manifest;
  const bindings =
    kind === "weekly_report" ? extractBindings(manifest, deck.data) : undefined;

  return {
    id: crypto.randomUUID(),
    name,
    kind,
    createdAt: new Date().toISOString(),
    sourceDeckId: deck.id,
    bindings,
    skeletonManifest: JSON.parse(JSON.stringify(manifest)) as SlideManifest,
    theme: manifest.theme,
    tone: manifest.tone,
    audience: manifest.audience,
  };
}
