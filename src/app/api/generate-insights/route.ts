import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText, stripJsonFences } from "@/lib/ai";
import {
  INSIGHT_SYSTEM_PROMPT,
  buildChartRecommendationUserPrompt,
} from "@/lib/prompts";
import { extractJson } from "@/lib/manifest";
import { parsedDataSchema } from "@/lib/schema";

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
      system: INSIGHT_SYSTEM_PROMPT,
      user: buildChartRecommendationUserPrompt(input.data),
      maxTokens: 500,
      temperature: 0.4,
      json: true,
    });

    let insights: string[] = [];
    try {
      const parsed = JSON.parse(extractJson(stripJsonFences(raw)));
      if (Array.isArray(parsed)) {
        insights = parsed.filter((s): s is string => typeof s === "string");
      } else if (parsed && Array.isArray(parsed.insights)) {
        insights = parsed.insights.filter((s: unknown): s is string => typeof s === "string");
      }
    } catch {
      return NextResponse.json(
        { error: "Could not parse insight response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ insights: insights.slice(0, 5) });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Insight generation failed." },
      { status: 500 }
    );
  }
}
