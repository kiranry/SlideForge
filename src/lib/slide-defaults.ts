import { defaultChartSpec } from "@/lib/chart-options";
import type { ParsedData, Slide, SlideType } from "@/lib/types";

const SLIDE_TYPE_LABELS: Record<SlideType, string> = {
  title: "Title",
  divider: "Divider",
  content: "Content",
  chart: "Chart",
  kpi: "KPI",
  table: "Table",
  comparison: "Comparison",
  quote: "Quote",
  timeline: "Timeline",
  closing: "Closing",
};

export function slideTypeLabel(type: SlideType): string {
  return SLIDE_TYPE_LABELS[type];
}

/** Blank slide shell for deck assembly (Phase 10). */
export function createBlankSlide(
  type: SlideType,
  index: number,
  data?: ParsedData | null
): Slide {
  const base = {
    index,
    type,
    title: "New slide",
    body: [] as string[],
    speaker_notes: "",
    layout_hint: "standard" as const,
    chart: null,
  };

  switch (type) {
    case "title":
      return {
        ...base,
        title: "Presentation title",
        subtitle: "Subtitle or date",
        layout_hint: "hero",
      };
    case "divider":
      return {
        ...base,
        title: "Section title",
        subtitle: "Optional subtitle",
      };
    case "closing":
      return {
        ...base,
        title: "Thank you",
        subtitle: "Questions?",
        body: [],
      };
    case "content":
      return {
        ...base,
        title: "Slide title",
        body: ["First point", "Second point", "Third point"],
      };
    case "chart":
      const chart = data ? defaultChartSpec(data) : null;
      return {
        ...base,
        type: "chart",
        title: chart ? "Chart" : "Chart slide",
        body: chart ? [] : ["Attach data to configure this chart."],
        chart,
      };
    case "kpi":
      return {
        ...base,
        title: "Key metrics",
        kpis: [
          { label: "Metric A", value: "42%", delta: "+5%" },
          { label: "Metric B", value: "$1.2M", delta: "+12%" },
        ],
      };
    case "table":
      return {
        ...base,
        title: "Data table",
        table: {
          columns: ["Column A", "Column B", "Column C"],
          rows: [
            ["Row 1", "Value", "Value"],
            ["Row 2", "Value", "Value"],
          ],
        },
      };
    case "comparison":
      return {
        ...base,
        title: "Comparison",
        comparison: {
          left: { heading: "Option A", points: ["Benefit one", "Benefit two"] },
          right: { heading: "Option B", points: ["Benefit one", "Benefit two"] },
        },
      };
    case "quote":
      return {
        ...base,
        title: "Quote",
        quote: { text: "A memorable quote goes here.", attribution: "Name" },
      };
    case "timeline":
      return {
        ...base,
        title: "Timeline",
        timeline: [
          { label: "Q1", title: "Milestone one", description: "Details" },
          { label: "Q2", title: "Milestone two", description: "Details" },
        ],
      };
    default:
      return base;
  }
}
