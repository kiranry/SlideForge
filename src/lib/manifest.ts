import { slideManifestSchema } from "@/lib/schema";
import { isRtlLanguage } from "@/lib/languages";
import type { SlideManifest } from "@/lib/types";

/**
 * Best-effort extraction of a JSON object/array from raw model text. Handles
 * stray prose or fences by slicing from the first brace to the last.
 */
export function extractJson(raw: string): string {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  const firstObj = trimmed.indexOf("{");
  const firstArr = trimmed.indexOf("[");
  const start =
    firstArr === -1
      ? firstObj
      : firstObj === -1
        ? firstArr
        : Math.min(firstObj, firstArr);
  if (start === -1) return trimmed.trim();
  const lastObj = trimmed.lastIndexOf("}");
  const lastArr = trimmed.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  return trimmed.slice(start, end + 1).trim();
}

export interface ManifestResult {
  ok: boolean;
  manifest?: SlideManifest;
  error?: string;
}

/**
 * Parse + validate model output into a SlideManifest. Normalizes slide indices
 * and forces the provided theme id so it always matches a known theme.
 */
export function validateManifest(
  raw: string,
  themeId: string
): ManifestResult {
  let json: unknown;
  try {
    json = JSON.parse(extractJson(raw));
  } catch (e) {
    return { ok: false, error: `Invalid JSON: ${(e as Error).message}` };
  }

  const parsed = slideManifestSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  }

  const manifest = parsed.data;
  manifest.theme = themeId;
  manifest.rtl = manifest.rtl ?? isRtlLanguage(manifest.language);
  manifest.slides = manifest.slides.map((slide, i) => ({
    ...slide,
    index: i + 1,
  }));

  return { ok: true, manifest };
}
