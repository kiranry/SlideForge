import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText, stripJsonFences } from "@/lib/ai";
import {
  SYNTHETIC_DATA_SYSTEM_PROMPT,
  buildSyntheticDataUserPrompt,
} from "@/lib/prompts";
import { extractJson } from "@/lib/manifest";
import { slideManifestSchema, slideSchema } from "@/lib/schema";
import { parseSyntheticDataResponse } from "@/lib/synthetic-data-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  description: z.string().optional(),
  manifest: slideManifestSchema.optional(),
  slide: slideSchema.optional(),
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

  if (!input.manifest && !input.slide) {
    return NextResponse.json(
      { error: "Provide manifest or slide context." },
      { status: 400 }
    );
  }

  try {
    const raw = await generateText({
      system: SYNTHETIC_DATA_SYSTEM_PROMPT,
      user: buildSyntheticDataUserPrompt({
        description: input.description,
        manifest: input.manifest,
        slide: input.slide,
      }),
      maxTokens: 2000,
      temperature: 0.5,
      json: true,
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJson(stripJsonFences(raw)));
    } catch {
      return NextResponse.json(
        { error: "Could not parse synthetic data response." },
        { status: 502 }
      );
    }

    const data = parseSyntheticDataResponse(parsed);
    if (!data) {
      return NextResponse.json(
        { error: "Model returned no usable data sheets." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Synthetic data generation failed." },
      { status: 500 }
    );
  }
}
