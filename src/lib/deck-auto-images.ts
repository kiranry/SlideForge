import type { Slide, SlideManifest } from "@/lib/types";
import {
  buildImagePrompt,
  MAX_AI_IMAGES_PER_DECK,
  countAiSlideImages,
} from "@/lib/slide-images";

function imagePresetForSlide(slide: Slide): "hero" | "illustration" | "photo" {
  if (slide.layout_hint === "full_bleed" || slide.layout_hint === "hero") return "hero";
  if (slide.type === "divider") return "hero";
  return "illustration";
}

function slidesEligibleForAutoImage(manifest: SlideManifest): Slide[] {
  return manifest.slides.filter((s) => {
    if (s.image?.dataUrl) return false;
    if (s.type === "chart" || s.type === "kpi" || s.type === "table") return false;
    if (s.type === "closing") return false;
    if (s.type === "title" && s.layout_hint !== "hero") return false;
    return true;
  });
}

/** Pick up to MAX_AI_IMAGES_PER_DECK slides spread across the deck. */
export function pickSlidesForAutoImages(manifest: SlideManifest): Slide[] {
  const eligible = slidesEligibleForAutoImage(manifest);
  if (!eligible.length) return [];
  if (eligible.length <= MAX_AI_IMAGES_PER_DECK) return eligible;

  const picks: Slide[] = [];
  const step = Math.ceil(eligible.length / MAX_AI_IMAGES_PER_DECK);
  for (let i = 0; i < eligible.length && picks.length < MAX_AI_IMAGES_PER_DECK; i += step) {
    picks.push(eligible[i]);
  }
  return picks;
}

/**
 * Client-side: generate AI images for selected slides and return an updated manifest.
 * Failures are non-fatal — skips slides that error.
 */
export async function enrichManifestWithAutoImages(
  manifest: SlideManifest,
  deckDescription: string,
  onProgress?: (message: string) => void
): Promise<SlideManifest> {
  const picks = pickSlidesForAutoImages(manifest);
  if (!picks.length) return manifest;

  let aiCount = countAiSlideImages(manifest);
  const slides = [...manifest.slides];
  const contextPrompt = deckDescription.trim().slice(0, 300);

  for (const pick of picks) {
    if (aiCount >= MAX_AI_IMAGES_PER_DECK) break;

    const idx = slides.findIndex((s) => s.index === pick.index);
    if (idx < 0) continue;

    const slide = slides[idx];
    const preset = imagePresetForSlide(slide);
    const userPrompt =
      contextPrompt ||
      slide.title ||
      "Professional business presentation visual";

    onProgress?.(`Generating image for "${slide.title}"…`);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userPrompt,
          slideTitle: slide.title,
          slideBody: slide.body,
          preset,
          aiImageCount: aiCount,
        }),
      });

      if (!res.ok) continue;

      const body = (await res.json()) as { dataUrl?: string; prompt?: string };
      if (!body.dataUrl) continue;

      const placement = preset === "hero" ? "hero" : "right";
      slides[idx] = {
        ...slide,
        image: {
          source: "ai",
          dataUrl: body.dataUrl,
          placement,
          prompt: body.prompt ?? userPrompt,
        },
        layout_hint:
          placement === "hero" ? "full_bleed" : slide.layout_hint,
      };
      aiCount++;
    } catch {
      /* non-fatal */
    }
  }

  return { ...manifest, slides };
}

/** Build prompt preview without calling the API (for debugging). */
export function autoImagePromptPreview(slide: Slide, deckDescription: string): string {
  const preset = imagePresetForSlide(slide);
  const userPrompt = deckDescription.trim().slice(0, 300) || slide.title;
  return buildImagePrompt(userPrompt, {
    title: slide.title,
    body: slide.body,
    preset,
  });
}
