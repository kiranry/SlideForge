import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText, stripJsonFences } from "@/lib/ai";
import { EDIT_CHART_SYSTEM_PROMPT, buildEditChartUserPrompt } from "@/lib/prompts";
import { chartSpecSchema, parsedDataSchema } from "@/lib/schema";
import { chartFitsData, parseChartSpec } from "@/lib/chart-validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  chart: chartSpecSchema,
  instruction: z.string().min(1).max(500),
  data: parsedDataSchema,
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

  const user = buildEditChartUserPrompt(
    input.chart as Record<string, unknown>,
    input.instruction,
    input.data
  );

  try {
    let raw = await generateText({
      system: EDIT_CHART_SYSTEM_PROMPT,
      user,
      maxTokens: 500,
      temperature: 0.4,
      json: true,
    });

    let result = parseChartSpec(stripJsonFences(raw));

    if (!result.ok) {
      raw = await generateText({
        system: EDIT_CHART_SYSTEM_PROMPT,
        user: `${user}\n\nPrevious response invalid: ${result.error}. Return corrected JSON only.`,
        maxTokens: 500,
        temperature: 0.2,
        json: true,
      });
      result = parseChartSpec(stripJsonFences(raw));
    }

    if (!result.ok || !result.chart) {
      return NextResponse.json(
        { error: result.error ?? "Model returned invalid chart." },
        { status: 502 }
      );
    }

    if (!chartFitsData(result.chart, input.data)) {
      return NextResponse.json(
        { error: "Updated chart references columns not found in the data file." },
        { status: 502 }
      );
    }

    return NextResponse.json({ chart: result.chart });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Chart edit failed." },
      { status: 500 }
    );
  }
}
