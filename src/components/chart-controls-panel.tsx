"use client";

import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartToolbar } from "@/components/chart-toolbar";
import { ChartDataPanel } from "@/components/chart-data-panel";
import { defaultChartSpec } from "@/lib/chart-options";
import { parseDataFile } from "@/lib/parse-client";
import {
  createBlankChartData,
  mergeParsedData,
} from "@/lib/manual-data";
import type { AnomalyFlag, ParsedData, Slide, SlideManifest } from "@/lib/types";

const MAX_DATA_BYTES = 10 * 1024 * 1024;

interface ChartControlsPanelProps {
  slide: Slide;
  data?: ParsedData | null;
  manifest?: SlideManifest;
  deckDescription?: string;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  onSlideChange: (slide: Slide) => void;
  onDataAttach?: (data: ParsedData) => void;
  onDataChange?: (data: ParsedData) => void;
  dataModified?: boolean;
  /** Hide remove on dedicated chart slides where chart is required. */
  lockChart?: boolean;
  embedded?: boolean;
}

export function ChartControlsPanel({
  slide,
  data,
  manifest,
  deckDescription,
  anomalyFlags,
  suppressedAnomalyIds,
  onSlideChange,
  onDataAttach,
  onDataChange,
  dataModified,
  lockChart = false,
  embedded = false,
}: ChartControlsPanelProps) {
  const shell = embedded
    ? "border-b border-border px-4 py-3 space-y-3"
    : "mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4";
  const labelClass = embedded
    ? "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
    : "font-mono text-xs uppercase tracking-wider text-muted-foreground";
  const dataInputRef = useRef<HTMLInputElement>(null);

  const attachData = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_DATA_BYTES) throw new Error("File exceeds 10 MB limit.");
      const parsed = await parseDataFile(file);
      if (!parsed.sheets.length) throw new Error("No data found in file.");
      return parsed;
    },
    onSuccess: (parsed) => {
      onDataAttach?.(parsed);
      toast.success(`Attached ${parsed.fileName} — chart settings are now available.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const generateAiData = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/generate-synthetic-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: deckDescription ?? manifest?.title,
          manifest,
          slide,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(error || "Could not generate data");
      }
      const { data: generated } = (await res.json()) as { data: ParsedData };
      if (!generated?.sheets?.length) throw new Error("No data returned.");
      return generated;
    },
    onSuccess: (generated) => {
      const merged = data?.sheets.length
        ? mergeParsedData(data, generated)
        : generated;
      onDataAttach?.(merged);
      if (!slide.chart && merged.sheets.length) {
        const spec = defaultChartSpec(merged);
        if (spec) onSlideChange({ ...slide, chart: spec });
      }
      toast.success("Sample chart data generated — edit cells below.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const startManualEntry = () => {
    const sheetName = slide.chart?.data_ref ?? slide.title ?? "Chart Data";
    const blank = createBlankChartData(sheetName);
    const merged = data?.sheets.length ? mergeParsedData(data, blank) : blank;
    onDataAttach?.(merged);
    const spec = slide.chart ?? defaultChartSpec(merged);
    if (spec) {
      onSlideChange({
        ...slide,
        chart: {
          ...spec,
          data_ref: sheetName,
          x_col: spec.x_col ?? "Category",
          y_cols: spec.y_cols ?? ["Value"],
        },
      });
    }
    toast.success("Editable chart table ready — change values in the panel below.");
  };

  const hasData = !!data?.sheets.length;
  const hasChart = !!slide.chart;

  const addChart = () => {
    if (!data?.sheets.length) return;
    const spec = defaultChartSpec(data);
    if (!spec) {
      toast.error("No numeric columns in your data. Add number columns to chart.");
      return;
    }
    onSlideChange({ ...slide, chart: spec });
  };

  const removeChart = () => onSlideChange({ ...slide, chart: null });

  const dataActions = (
    <div className="flex flex-wrap gap-2">
      <input
        ref={dataInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf"
        className="hidden"
        aria-label="Upload spreadsheet for charts"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) attachData.mutate(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={attachData.isPending || !onDataAttach}
        onClick={() => dataInputRef.current?.click()}
      >
        {attachData.isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1.5 h-3.5 w-3.5" />
        )}
        Upload file
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={generateAiData.isPending || !onDataAttach}
        onClick={() => generateAiData.mutate()}
      >
        {generateAiData.isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        )}
        Generate with AI
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!onDataAttach}
        onClick={startManualEntry}
      >
        <Pencil className="mr-1.5 h-3.5 w-3.5" /> Enter manually
      </Button>
    </div>
  );

  if (!hasChart) {
    if (!hasData) {
      return (
        <div className={shell}>
          <p className={labelClass}>Chart data</p>
          {!embedded && (
            <p className="text-xs text-muted-foreground">
              Generate sample data with AI, enter manually, or upload a file.
            </p>
          )}
          {dataActions}
        </div>
      );
    }

    return (
      <div className={shell}>
        <p className={labelClass}>Chart</p>
        <Button type="button" variant="outline" size="sm" onClick={addChart}>
          <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Add chart from data
        </Button>
      </div>
    );
  }

  return (
    <section
      className={shell}
      aria-labelledby="chart-settings-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="chart-settings-heading" className={labelClass}>
          Chart
        </p>
        {!lockChart && (
          <Button type="button" variant="outline" size="sm" onClick={removeChart}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove chart
          </Button>
        )}
      </div>

      {hasData ? (
        <>
          <ChartToolbar
            embedded={embedded}
            slide={slide}
            data={data}
            onSlideChange={onSlideChange}
          />
          <ChartDataPanel
            slide={slide}
            data={data}
            dataModified={dataModified}
            anomalyFlags={anomalyFlags}
            suppressedAnomalyIds={suppressedAnomalyIds}
            onDataChange={onDataChange}
          />
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-amber-700">
            This slide has a chart but no data is attached yet.
          </p>
          {dataActions}
        </div>
      )}
    </section>
  );
}
