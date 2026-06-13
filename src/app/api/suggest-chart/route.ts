import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText, stripJsonFences } from "@/lib/ai";
import {
  SUGGEST_CHART_SYSTEM_PROMPT,
  buildSuggestChartUserPrompt,
} from "@/lib/prompts";
import { chartSpecSchema, chartSuggestionSchema, parsedDataSchema } from "@/lib/schema";
import {
  parseChartSuggestion,
  suggestionToChartSpec,
} from "@/lib/chart-validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  data: parsedDataSchema,
  currentChart: chartSpecSchema.nullable().optional(),
  slideTitle: z.string().optional(),
  slideBody: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid request: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  try {
    const raw = await generateText({
      system: SUGGEST_CHART_SYSTEM_PROMPT,
      user: buildSuggestChartUserPrompt({
        data: input.data,
        currentChart: input.currentChart,
        slideTitle: input.slideTitle,
        slideBody: input.slideBody,
      }),
      maxTokens: 600,
      temperature: 0.3,
      json: true,
    });

    let parsed = parseChartSuggestion(stripJsonFences(raw));
    if (!parsed.ok) {
      const retry = await generateText({
        system: SUGGEST_CHART_SYSTEM_PROMPT,
        user: `${buildSuggestChartUserPrompt({
          data: input.data,
          currentChart: input.currentChart,
          slideTitle: input.slideTitle,
          slideBody: input.slideBody,
        })}\n\nPrevious response invalid: ${parsed.error}. Return corrected JSON only.`,
        maxTokens: 600,
        temperature: 0.2,
        json: true,
      });
      parsed = parseChartSuggestion(stripJsonFences(retry));
    }

    if (!parsed.ok || !parsed.suggestion) {
      return NextResponse.json(
        { error: parsed.error ?? "Could not parse chart suggestion." },
        { status: 502 }
      );
    }

    const chartResult = suggestionToChartSpec(parsed.suggestion, input.data);
    if (!chartResult.ok || !chartResult.chart) {
      return NextResponse.json(
        { error: chartResult.error ?? "Suggestion did not match dataset." },
        { status: 502 }
      );
    }

    const suggestion = chartSuggestionSchema.parse({
      ...parsed.suggestion,
      sheet: chartResult.chart.data_ref ?? parsed.suggestion.sheet,
      x_col: chartResult.chart.x_col ?? parsed.suggestion.x_col,
      y_col: chartResult.chart.y_cols?.[0] ?? parsed.suggestion.y_col,
      chart_type: chartResult.chart.type,
      rationale: parsed.suggestion.rationale,
    });

    return NextResponse.json({ suggestion, chart: chartResult.chart });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Chart suggestion failed." },
      { status: 500 }
    );
  }
}
