"use client";

import { useBuilderStore } from "@/lib/store";
import { CHART_TYPES } from "@/lib/schema";
import type { ChartRecommendation, ChartType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CHART_LABELS: Record<ChartType, string> = {
  bar: "Bar",
  line: "Line",
  area: "Area",
  pie: "Pie",
  donut: "Donut",
  scatter: "Scatter",
  combo: "Combo",
};

function recKey(r: ChartRecommendation) {
  return `${r.sheet}:${r.x_col}:${r.y_col}`;
}

export function DataPreview() {
  const store = useBuilderStore();
  const data = store.parsedData;
  const recs = store.chartRecommendations;

  if (!data || data.sheets.length === 0) return null;

  const updateRec = (index: number, chart_type: ChartType) => {
    if (!recs) return;
    const next = recs.map((r, i) => (i === index ? { ...r, chart_type } : r));
    store.setChartRecommendations(next);
  };

  return (
    <div className="space-y-4">
      {data.sheets.map((sheet) => {
        const previewRows = sheet.rows.slice(0, 5);
        const sheetRecs =
          recs?.filter((r) => r.sheet === sheet.name) ?? [];

        return (
          <Card key={sheet.name}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{sheet.name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {sheet.rowCount} rows · {sheet.columns.length} columns
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Column types */}
              <div className="flex flex-wrap gap-1.5">
                {sheet.columns.map((col) => (
                  <Badge key={col.name} variant="secondary" className="font-mono text-xs">
                    {col.name}
                    <span className="ml-1 opacity-60">({col.type})</span>
                  </Badge>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {sheet.columns.map((col) => (
                        <th
                          key={col.name}
                          className="px-3 py-2 text-left font-medium"
                        >
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border/50 last:border-0">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 font-mono">
                            {cell === null ? "—" : String(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheet.rowCount > 5 && (
                  <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
                    Showing 5 of {sheet.rowCount} rows
                  </p>
                )}
              </div>

              {/* Chart recommendations */}
              {sheetRecs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Suggested charts
                  </Label>
                  {sheetRecs.map((rec) => {
                    const globalIdx = recs!.findIndex((r) => recKey(r) === recKey(rec));
                    return (
                      <div
                        key={recKey(rec)}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
                      >
                        <span className="text-sm">
                          <span className="font-medium">{rec.y_col}</span>
                          <span className="text-muted-foreground"> by </span>
                          <span className="font-medium">{rec.x_col}</span>
                        </span>
                        <Select
                          value={rec.chart_type}
                          onValueChange={(v) =>
                            updateRec(globalIdx, v as ChartType)
                          }
                        >
                          <SelectTrigger className="ml-auto h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CHART_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {CHART_LABELS[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="w-full text-xs text-muted-foreground">
                          {rec.rationale}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
