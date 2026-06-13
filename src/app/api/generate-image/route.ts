import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateImageDataUrl } from "@/lib/ai/generate-image";
import { env } from "@/lib/env";
import { buildImagePrompt } from "@/lib/slide-images";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  prompt: z.string().min(3).max(500),
  slideTitle: z.string().default("Untitled slide"),
  slideBody: z.array(z.string()).optional(),
  preset: z.enum(["hero", "illustration", "photo"]).optional(),
  aspectRatio: z.enum(["16:9", "1:1", "4:3"]).optional(),
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

  const fullPrompt = buildImagePrompt(input.prompt, {
    title: input.slideTitle,
    body: input.slideBody,
    preset: input.preset,
  });

  const aspectRatio =
    input.aspectRatio ??
    (input.preset === "illustration" ? "1:1" : input.preset === "photo" ? "4:3" : "16:9");

  try {
    const { dataUrl, provider } = await generateImageDataUrl({
      prompt: fullPrompt,
      aspectRatio,
    });
    return NextResponse.json({
      dataUrl,
      prompt: input.prompt,
      provider,
      model:
        provider === "gemini"
            ? env.googleImageModel
            : provider === "huggingface"
              ? env.huggingfaceImageModel
              : "pollinations-sana",
    });
  } catch (e) {
    const message = errorMessage(e);
    const status = /content policy|blocked/i.test(message)
      ? 422
      : /quota|429|unavailable|rate/i.test(message)
        ? 429
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
