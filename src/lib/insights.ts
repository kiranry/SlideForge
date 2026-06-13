import type { Slide, SlideManifest } from "@/lib/types";

/** Insert insight callout slides after each chart slide in the manifest. */
export function insertInsightSlides(
  manifest: SlideManifest,
  insights: string[]
): SlideManifest {
  if (insights.length === 0) return manifest;

  const newSlides: Slide[] = [];
  let insightIdx = 0;

  for (const slide of manifest.slides) {
    newSlides.push(slide);
    if (slide.type === "chart") {
      const text = insights[insightIdx % insights.length];
      insightIdx++;
      newSlides.push({
        index: 0,
        type: "content",
        title: "Key insight",
        body: [text],
        speaker_notes: `Highlight this insight when discussing the chart on slide ${newSlides.length - 1}.`,
        layout_hint: "hero",
        chart: null,
        is_insight: true,
      });
    }
  }

  return {
    ...manifest,
    slides: newSlides.map((s, i) => ({ ...s, index: i + 1 })),
  };
}

export function hasInsightSlides(manifest: SlideManifest): boolean {
  return manifest.slides.some((s) => s.is_insight);
}
