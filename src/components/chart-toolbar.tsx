"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHART_TYPES } from "@/lib/schema";
import {
  allowedChartTypes,
  chartTypeLabel,
  findSheet,
  numericColumns,
  sheetColumnNames,
} from "@/lib/chart-options";
import type { ChartSpec, ChartType, ParsedData, Slide } from "@/lib/types";

/** Radix Select throws if value is empty or not in the item list. */
function coerceSelectValue(
  value: string | undefined,
  options: string[]
): string | undefined {
  if (!options.length) return undefined;
  if (value && options.includes(value)) return value;
  return options[0];
}

interface ChartSuggestion {
  sheet: string;
  x_col: string;
  y_col: string;
  chart_type: ChartType;
  rationale: string;
}

interface ChartToolbarProps {
  slide: Slide;
  data?: ParsedData | null;
  onSlideChange: (slide: Slide) => void;
  /** Narrow sidebar layout — stack controls full width. */
  embedded?: boolean;
}

export function ChartToolbar({
  slide,
  data,
  onSlideChange,
  embedded = false,
}: ChartToolbarProps) {
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    suggestion: ChartSuggestion;
    chart: ChartSpec;
  } | null>(null);
  const [editInstruction, setEditInstruction] = useState("");

  const chart = slide.chart;
  const sheet = chart && data ? findSheet(data, chart.data_ref) : null;

  const suggestChart = useMutation({
    mutationFn: async () => {
      if (!data || !chart) throw new Error("Chart and data required.");
      const res = await fetch("/api/suggest-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          currentChart: chart,
          slideTitle: slide.title,
          slideBody: slide.body,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Suggestion failed");
      }
      return res.json() as Promise<{ suggestion: ChartSuggestion; chart: ChartSpec }>;
    },
    onSuccess: (result) => {
      setPendingSuggestion(result);
      toast.success("Chart suggestion ready — review and apply.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const editChart = useMutation({
    mutationFn: async (instruction: string) => {
      if (!data || !chart) throw new Error("Chart and data required.");
      const res = await fetch("/api/edit-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chart, instruction, data }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Chart edit failed");
      }
      const { chart: updated } = (await res.json()) as { chart: ChartSpec };
      return updated;
    },
    onSuccess: (updated) => {
      onSlideChange({ ...slide, chart: updated });
      setEditInstruction("");
      setPendingSuggestion(null);
      toast.success("Chart updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!chart || !data || !sheet) return null;

  const allowed = allowedChartTypes(chart, data);
  const nums = numericColumns(sheet);
  const allCols = sheetColumnNames(sheet);

  const patchChart = (patch: Partial<ChartSpec>) => {
    onSlideChange({
      ...slide,
      chart: { ...chart, ...patch },
    });
  };

  const applySuggestion = () => {
    if (!pendingSuggestion) return;
    onSlideChange({ ...slide, chart: pendingSuggestion.chart });
    setPendingSuggestion(null);
    toast.success("Chart suggestion applied");
  };

  const settingsGridClass = embedded
    ? "grid gap-3"
    : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className={embedded ? "space-y-4" : "space-y-3"}>
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={embedded ? "w-full" : undefined}
          disabled={suggestChart.isPending}
          aria-label="AI suggest chart type and axes"
          onClick={() => suggestChart.mutate()}
        >
          {suggestChart.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          )}
          AI suggest chart
        </Button>

        {pendingSuggestion && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm leading-snug text-foreground">
              {pendingSuggestion.suggestion.rationale}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Suggest{" "}
              <span className="font-medium capitalize">
                {chartTypeLabel(pendingSuggestion.suggestion.chart_type)}
              </span>
              {" — "}
              {pendingSuggestion.suggestion.y_col} by{" "}
              {pendingSuggestion.suggestion.x_col}
              {" on "}
              {pendingSuggestion.suggestion.sheet}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={applySuggestion}>
                Apply suggestion
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setPendingSuggestion(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {!pendingSuggestion && chart.ai_rationale && (
          <p className="rounded-md bg-muted/40 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
            {chart.ai_rationale}
          </p>
        )}
      </div>

      <div
        className={
          embedded
            ? "space-y-3 rounded-md border border-border/70 bg-background/60 p-3"
            : "rounded-lg border border-border bg-muted/30 p-3"
        }
      >
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Chart settings
        </p>

        <div className={settingsGridClass}>
          <div className="min-w-0">
            <Label id="chart-type-label" className="mb-1.5 block text-xs">
              Chart type
            </Label>
            <Select
              value={chart.type}
              onValueChange={(v) => patchChart({ type: v as ChartType })}
            >
              <SelectTrigger className="h-9 w-full" aria-labelledby="chart-type-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map((t) => (
                  <SelectItem key={t} value={t} disabled={!allowed.includes(t)}>
                    {chartTypeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label id="chart-sheet-label" className="mb-1.5 block text-xs">
              Sheet
            </Label>
            <Select
              value={chart.data_ref ?? sheet.name}
              onValueChange={(v) => patchChart({ data_ref: v })}
            >
              <SelectTrigger className="h-9 w-full" aria-labelledby="chart-sheet-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {data.sheets.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-0">
            <Label id="chart-x-label" className="mb-1.5 block text-xs">
              X axis (category)
            </Label>
            {allCols.length ? (
              <Select
                value={coerceSelectValue(chart.x_col, allCols)!}
                onValueChange={(v) => patchChart({ x_col: v })}
              >
                <SelectTrigger className="h-9 w-full" aria-labelledby="chart-x-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCols.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">No columns in sheet.</p>
            )}
          </div>

          {(chart.type === "bar" || chart.type === "combo") && (
            <div className="min-w-0">
              <Label id="chart-bar-layout-label" className="mb-1.5 block text-xs">
                Bar layout
              </Label>
              <Select
                value={chart.stacked ? "stacked" : "grouped"}
                onValueChange={(v) =>
                  patchChart({
                    stacked: v === "stacked",
                    grouped: v === "grouped",
                  })
                }
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-labelledby="chart-bar-layout-label"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grouped">Grouped (side by side)</SelectItem>
                  <SelectItem value="stacked">Stacked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="min-w-0">
            <Label id="chart-y-label" className="mb-1.5 block text-xs">
              Y axis (values)
            </Label>
            {nums.length ? (
              <Select
                value={coerceSelectValue(chart.y_cols?.[0], nums)!}
                onValueChange={(v) => patchChart({ y_cols: [v] })}
              >
                <SelectTrigger className="h-9 w-full" aria-labelledby="chart-y-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {nums.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted-foreground">
                No numeric columns — upload data with numbers for the Y axis.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label id="chart-edit-label" className="block text-xs">
          Describe a chart change
        </Label>
        <Input
          id="chart-edit-input"
          value={editInstruction}
          onChange={(e) => setEditInstruction(e.target.value)}
          placeholder='e.g. "switch to a line chart" or "plot revenue by month"'
          className="h-9"
          aria-labelledby="chart-edit-label"
          onKeyDown={(e) => {
            if (e.key === "Enter" && editInstruction.trim()) {
              editChart.mutate(editInstruction.trim());
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={embedded ? "w-full" : "shrink-0"}
          disabled={!editInstruction.trim() || editChart.isPending}
          aria-label="Apply natural language chart fix"
          onClick={() => editChart.mutate(editInstruction.trim())}
        >
          {editChart.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Fix chart
        </Button>
      </div>

      {!embedded && (
        <p className="text-xs text-muted-foreground">
          Manual changes and AI suggestions update the preview and exported PowerPoint
          immediately.
        </p>
      )}
    </div>
  );
}
