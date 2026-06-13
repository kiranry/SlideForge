import { slideSchema } from "@/lib/schema";
import { extractJson } from "@/lib/manifest";
import type { Slide } from "@/lib/types";

export interface SlideResult {
  ok: boolean;
  slide?: Slide;
  error?: string;
}

export function validateSlide(raw: string, index?: number): SlideResult {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const parsed = slideSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    };
  }

  const slide = parsed.data;
  if (index !== undefined) slide.index = index;

  return { ok: true, slide };
}
