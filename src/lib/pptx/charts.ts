import "server-only";
import type pptxgen from "pptxgenjs";
import { REGIONS, type Box } from "@/lib/layout";
import { pptxBodyFont, pptxChartColors } from "./build-context";
import type { Theme } from "@/lib/themes";
import type { AnomalyFlag, ParsedData, Slide, ChartType } from "@/lib/types";
import { anomaliesForChart } from "@/lib/anomalies";
import { resolveChartData } from "@/lib/chart-data";

type PptxSlide = ReturnType<pptxgen["addSlide"]>;
type ChartName = Parameters<PptxSlide["addChart"]>[0];

/** Map our chart types onto pptxgenjs chart type names. */
function pptxChartType(type: ChartType): ChartName {
  const name =
    type === "line"
      ? "line"
      : type === "area"
        ? "area"
        : type === "pie"
          ? "pie"
          : type === "donut"
            ? "doughnut"
            : type === "scatter"
              ? "scatter"
              : "bar";
  return name as ChartName;
}

/**
 * Adds a native (editable) pptx chart for the slide. Returns false when the
 * chart cannot be built (no data ref / unresolvable columns) so the caller can
 * fall back to text.
 */
export function addChartToSlide(
  s: PptxSlide,
  slide: Slide,
  theme: Theme,
  data?: ParsedData | null,
  regionOverride?: Box
): boolean {
  if (!slide.chart || !data) return false;
  const resolved = resolveChartData(slide.chart, data);
  if (!resolved || resolved.series.length === 0) return false;

  const { labels, series } = resolved;
  const type = slide.chart.type;
  const region = regionOverride ?? REGIONS.chart;

  const common = {
    x: region.x,
    y: region.y,
    w: region.w,
    h: region.h,
    chartColors: pptxChartColors(theme.chart, slide.chart?.colors),
    showLegend: series.length > 1,
    legendPos: "b" as const,
    legendColor: theme.body,
    showTitle: false,
    catAxisLabelColor: theme.body,
    valAxisLabelColor: theme.body,
    catAxisLabelFontFace: pptxBodyFont(),
    valAxisLabelFontFace: pptxBodyFont(),
    catAxisLabelFontSize: 10,
    valAxisLabelFontSize: 10,
  };

  if (type === "pie" || type === "donut") {
    s.addChart(pptxChartType(type), [
      { name: series[0].name, labels, values: series[0].values },
    ], {
      ...common,
      showLegend: true,
      showPercent: true,
      ...(type === "donut" ? { holeSize: 60 } : {}),
    });
    return true;
  }

  if (type === "scatter") {
    const data2: { name: string; values: number[] }[] = [
      { name: "X", values: labels.map((l) => Number(l) || 0) },
      ...series.map((ser) => ({ name: ser.name, values: ser.values })),
    ];
    s.addChart(pptxChartType("scatter"), data2, { ...common, lineSize: 0 });
    return true;
  }

  const chartData = series.map((ser) => ({
    name: ser.name,
    labels,
    values: ser.values,
  }));
  const stacked = slide.chart.stacked === true && !slide.chart.grouped;
  s.addChart(pptxChartType(type), chartData, {
    ...common,
    barDir: "col" as const,
    barGrouping: stacked ? ("stacked" as const) : ("clustered" as const),
  });
  return true;
}

/** Red callout labels for flagged data points on chart slides. */
export function addAnomalyCallouts(
  s: PptxSlide,
  slide: Slide,
  data: ParsedData,
  flags: AnomalyFlag[],
  suppressed: string[] = []
): void {
  if (!slide.chart || flags.length === 0) return;
  const relevant = anomaliesForChart(
    flags,
    slide.chart.data_ref,
    slide.chart.y_cols?.[0],
    suppressed
  );
  relevant.slice(0, 2).forEach((a, i) => {
    const region = REGIONS.chart;
    s.addText(a.message, {
      x: region.x + 0.1,
      y: region.y + region.h - 0.38 - i * 0.32,
      w: region.w - 0.2,
      h: 0.3,
      fontFace: pptxBodyFont(),
      fontSize: 9,
      color: "B91C1C",
      fill: { color: "FEF2F2" },
      align: "left",
      valign: "middle",
    });
  });
}
