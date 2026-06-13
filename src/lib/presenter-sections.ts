import type { SlideManifest } from "@/lib/types";
import type { PresenterSection } from "@/lib/presenter-docx";

/** Build presenter script sections from manifest speaker notes (no AI). */
export function presenterSectionsFromManifest(
  manifest: SlideManifest
): PresenterSection[] {
  return manifest.slides.map((s) => ({
    slide_number: s.index,
    title: s.title,
    script:
      s.speaker_notes?.trim() ||
      s.body.join(". ").trim() ||
      `Discuss slide ${s.index}: ${s.title}.`,
  }));
}
