"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { resolveChartData } from "@/lib/chart-data";
import { anomaliesForChart } from "@/lib/anomalies";
import { MAX_DECK_DATA_ROWS, patchDataCell } from "@/lib/data-edit";
import { findSheet } from "@/lib/chart-options";
import type { AnomalyFlag, ParsedData, Slide } from "@/lib/types";

interface ChartDataPanelProps {
  slide: Slide;
  data?: ParsedData | null;
  dataModified?: boolean;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  onDataChange?: (data: ParsedData) => void;
}

function EditableCell({
  value,
  editable,
  onCommit,
  ariaLabel,
}: {
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (!editable) {
    return <span>{value || "—"}</span>;
  }

  return (
    <input
      type="text"
      value={draft}
      aria-label={ariaLabel}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className="w-full min-w-[3rem] rounded border border-transparent bg-transparent px-1 py-0.5 font-mono text-xs hover:border-border focus:border-primary focus:bg-background focus:outline-none"
    />
  );
}

export function ChartDataPanel({
  slide,
  data,
  dataModified,
  anomalyFlags = [],
  suppressedAnomalyIds = [],
  onDataChange,
}: ChartDataPanelProps) {
  const [open, setOpen] = useState(true);
  const editable = !!onDataChange && !!data;

  if (!slide.chart || !data) return null;

  const chart = slide.chart;
  const sheet = findSheet(data, chart.data_ref);
  const resolved = resolveChartData(chart, data);

  if (!sheet || !resolved) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
        Chart data could not be resolved. Check sheet and column selections above.
      </div>
    );
  }

  const xCol = chart.x_col ?? sheet.columns[0]?.name;
  const yCol = chart.y_cols?.[0];
  const flaggedLabels = new Set(
    anomaliesForChart(
      anomalyFlags,
      chart.data_ref,
      yCol,
      suppressedAnomalyIds
    ).map((f) => f.xLabel)
  );

  const xIdx = sheet.columns.findIndex((c) => c.name === xCol);
  const previewRows = sheet.rows.slice(0, MAX_DECK_DATA_ROWS);
  const truncatedOriginal = sheet.rowCount > MAX_DECK_DATA_ROWS;

  const commitCell = (rowIndex: number, colIndex: number, raw: string) => {
    if (!data || !onDataChange) return;
    onDataChange(patchDataCell(data, sheet.name, rowIndex, colIndex, raw));
  };

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="chart-data-panel-content"
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40"
      >
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Table2 className="h-4 w-4 text-muted-foreground" />
          Chart data — {sheet.name}
          {editable && (
            <Badge variant="muted" className="gap-1 text-[10px] font-normal">
              <Pencil className="h-3 w-3" /> Editable
            </Badge>
          )}
          {dataModified && (
            <Badge variant="outline" className="text-[10px] font-normal text-amber-700">
              Modified in app
            </Badge>
          )}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div id="chart-data-panel-content" className="border-t border-border px-3 pb-3">
          <p className="mb-2 mt-2 text-xs text-muted-foreground">
            {xCol && yCol
              ? `Plotting "${yCol}" by "${xCol}" · ${resolved.labels.length} points in chart`
              : `${resolved.labels.length} points in chart`}
            {flaggedLabels.size > 0 && (
              <span className="ml-1 text-amber-600">
                · {flaggedLabels.size} anomaly row(s) highlighted
              </span>
            )}
            {editable && (
              <span className="ml-1">· Click cells below to edit; chart updates automatically</span>
            )}
          </p>

          <div className="mb-3 overflow-x-auto rounded-md border border-border">
            <table className="w-full text-xs" aria-label="Chart series preview">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-2 py-1.5 text-left font-medium">{xCol ?? "Category"}</th>
                  {resolved.series.map((s) => (
                    <th key={s.name} className="px-2 py-1.5 text-left font-medium">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resolved.labels.map((label, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border/50 last:border-0 ${
                      flaggedLabels.has(label) ? "bg-amber-500/10" : ""
                    }`}
                  >
                    <td className="px-2 py-1 font-mono">{label}</td>
                    {resolved.series.map((s) => (
                      <td key={s.name} className="px-2 py-1 font-mono">
                        {s.values[i] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Source sheet ({previewRows.length} row{previewRows.length === 1 ? "" : "s"}
            {truncatedOriginal ? ` of ${sheet.rowCount} in original file` : ""})
          </p>
          <div className="max-h-[320px] overflow-auto rounded-md border border-border">
            <table className="w-full text-xs" aria-label="Editable source data">
              <thead className="sticky top-0 z-10 bg-muted/95">
                <tr className="border-b border-border">
                  {sheet.columns.map((col) => (
                    <th key={col.name} className="px-2 py-1.5 text-left font-medium">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => {
                  const xVal = xIdx >= 0 ? String(row[xIdx] ?? "") : "";
                  const flagged = flaggedLabels.has(xVal);
                  return (
                    <tr
                      key={ri}
                      className={`border-b border-border/50 last:border-0 ${
                        flagged ? "bg-amber-500/10" : ""
                      }`}
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-1 py-0.5 font-mono">
                          <EditableCell
                            key={`${ri}-${ci}-${cell === null ? "" : String(cell)}`}
                            value={cell === null ? "" : String(cell)}
                            editable={editable}
                            ariaLabel={`Row ${ri + 1}, ${sheet.columns[ci]?.name ?? "column"}`}
                            onCommit={(raw) => commitCell(ri, ci, raw)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {truncatedOriginal && (
            <p className="mt-1 text-xs text-amber-700">
              Only the first {MAX_DECK_DATA_ROWS} rows are loaded in the deck. Edits apply to
              this slice; re-upload the file to refresh from source.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
