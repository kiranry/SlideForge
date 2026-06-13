import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/ai";
import {
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from "@/lib/prompts";
import { validateManifest } from "@/lib/manifest";
import {
  parsedDataSchema,
  toneSchema,
  audienceSchema,
  chartRecommendationSchema,
  deckStructureSchema,
} from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  description: z.string().max(2000).default(""),
  slideCount: z.number().int().min(1).max(30).default(10),
  tone: toneSchema.default("professional"),
  audience: audienceSchema.default("general"),
  theme: z.string().default("midnight-executive"),
  language: z.string().default("en"),
  data: parsedDataSchema.nullable().optional(),
  recommendations: z.array(chartRecommendationSchema).nullable().optional(),
  structureSkeleton: deckStructureSchema.nullable().optional(),
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

  if (!input.description.trim() && !input.data) {
    return NextResponse.json(
      { error: "Provide a description, a data file, or both." },
      { status: 400 }
    );
  }

  const maxSlides = Math.min(30, Math.max(3, input.slideCount + 4));
  const system = buildOutlineSystemPrompt(maxSlides);
  const user = buildOutlineUserPrompt({
    description: input.description,
    slideCount: input.slideCount,
    tone: input.tone,
    audience: input.audience,
    language: input.language,
    theme: input.theme,
    data: input.data,
    recommendations: input.recommendations,
    structureSkeleton: input.structureSkeleton,
  });

  try {
    let raw = await generateText({
      system,
      user,
      maxTokens: 4000,
      temperature: 0.7,
      json: true,
    });

    let result = validateManifest(raw, input.theme);

    // One repair attempt if the first response did not validate.
    if (!result.ok) {
      raw = await generateText({
        system,
        user: `${user}\n\nYour previous response was invalid: ${result.error}\nReturn corrected JSON only, matching the schema exactly.`,
        maxTokens: 4000,
        temperature: 0.2,
        json: true,
      });
      result = validateManifest(raw, input.theme);
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: `Model returned invalid output: ${result.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ manifest: result.manifest });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    const status = err.status ?? 500;
    return NextResponse.json(
      { error: cleanError(err.message) },
      { status: status >= 400 && status < 600 ? status : 500 }
    );
  }
}

/** Unwrap nested provider JSON error strings into a readable message. */
function cleanError(message?: string): string {
  if (!message) return "Generation failed.";
  try {
    const parsed = JSON.parse(message);
    return parsed?.error?.message ?? message;
  } catch {
    return message;
  }
}
