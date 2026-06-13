import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/ai";
import {
  buildRemixSystemPrompt,
  buildRemixUserPrompt,
  REMIX_TARGETS,
} from "@/lib/prompts";
import { validateManifest } from "@/lib/manifest";
import { slideManifestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  manifest: slideManifestSchema,
  target: z.enum(REMIX_TARGETS),
});

const MAX_SLIDES: Record<string, number> = {
  executive_summary: 7,
  technical_deep_dive: 18,
  sales_pitch: 12,
};

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

  const maxSlides = MAX_SLIDES[input.target] ?? 15;
  const system = buildRemixSystemPrompt(maxSlides);
  const user = buildRemixUserPrompt(input.manifest, input.target);

  try {
    let raw = await generateText({
      system,
      user,
      maxTokens: 4000,
      temperature: 0.65,
      json: true,
    });

    let result = validateManifest(raw, input.manifest.theme);

    if (!result.ok) {
      raw = await generateText({
        system,
        user: `${user}\n\nPrevious response invalid: ${result.error}. Return corrected JSON only.`,
        maxTokens: 4000,
        temperature: 0.2,
        json: true,
      });
      result = validateManifest(raw, input.manifest.theme);
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: `Model returned invalid output: ${result.error}` },
        { status: 502 }
      );
    }

    const manifest = result.manifest!;
    manifest.language = input.manifest.language;
    manifest.rtl = input.manifest.rtl;

    return NextResponse.json({ manifest });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Remix failed." },
      { status: 500 }
    );
  }
}
