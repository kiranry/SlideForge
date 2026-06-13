import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText, stripJsonFences } from "@/lib/ai";
import {
  CHART_RECOMMENDATION_SYSTEM_PROMPT,
  buildChartRecommendationUserPrompt,
} from "@/lib/prompts";
import { parsedDataSchema, chartRecommendationsSchema } from "@/lib/schema";
import { extractJson } from "@/lib/manifest";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({ data: parsedDataSchema });

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
      system: CHART_RECOMMENDATION_SYSTEM_PROMPT,
      user: buildChartRecommendationUserPrompt(input.data),
      maxTokens: 1500,
      temperature: 0.3,
      json: true,
    });

    let recommendations;
    try {
      recommendations = chartRecommendationsSchema.parse(
        JSON.parse(extractJson(stripJsonFences(raw)))
      );
    } catch {
      // Non-fatal: fall back to no recommendations rather than erroring.
      recommendations = { recommendations: [] };
    }

    return NextResponse.json(recommendations);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Recommendation failed." },
      { status: 500 }
    );
  }
}
