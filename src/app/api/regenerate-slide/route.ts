import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "@/lib/ai";
import {
  buildRegenerateSlideSystemPrompt,
  buildRegenerateSlideUserPrompt,
} from "@/lib/prompts";
import { validateSlide } from "@/lib/slide-validate";
import { slideSchema, toneSchema, audienceSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  slide: slideSchema,
  instruction: z.string().min(1).max(500),
  context: z
    .object({
      deckTitle: z.string().optional(),
      tone: toneSchema.optional(),
      audience: audienceSchema.optional(),
    })
    .optional(),
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

  const system = buildRegenerateSlideSystemPrompt();
  const user = buildRegenerateSlideUserPrompt(
    input.slide,
    input.instruction,
    input.context
  );

  try {
    let raw = await generateText({
      system,
      user,
      maxTokens: 800,
      temperature: 0.6,
      json: true,
    });

    let result = validateSlide(raw, input.slide.index);

    if (!result.ok) {
      raw = await generateText({
        system,
        user: `${user}\n\nPrevious response invalid: ${result.error}. Return corrected JSON only.`,
        maxTokens: 800,
        temperature: 0.2,
        json: true,
      });
      result = validateSlide(raw, input.slide.index);
    }

    if (!result.ok) {
      return NextResponse.json(
        { error: `Model returned invalid slide: ${result.error}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ slide: result.slide });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Regeneration failed." },
      { status: 500 }
    );
  }
}
