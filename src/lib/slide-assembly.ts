import type { Slide, SlideManifest } from "@/lib/types";

/** Reassign 1-based slide indices after assembly edits. */
export function reindexSlides(slides: Slide[]): Slide[] {
  return slides.map((s, i) => ({ ...s, index: i + 1 }));
}

export function duplicateSlideAt(slides: Slide[], index: number): Slide[] {
  const copy = JSON.parse(JSON.stringify(slides[index])) as Slide;
  const next = [...slides];
  next.splice(index + 1, 0, copy);
  return reindexSlides(next);
}

export function removeSlideAt(slides: Slide[], index: number): Slide[] {
  if (slides.length <= 1) {
    throw new Error("Cannot delete the only slide in the deck.");
  }
  return reindexSlides(slides.filter((_, i) => i !== index));
}

export function insertSlideAt(
  slides: Slide[],
  index: number,
  slide: Slide
): Slide[] {
  const next = [...slides];
  next.splice(index, 0, slide);
  return reindexSlides(next);
}

export function moveSlide(slides: Slide[], from: number, to: number): Slide[] {
  if (from === to || from < 0 || to < 0 || from >= slides.length || to >= slides.length) {
    return slides;
  }
  const next = [...slides];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return reindexSlides(next);
}

export function countLockedSlides(slides: Slide[]): number {
  return slides.filter((s) => s.locked).length;
}

/**
 * After remix, restore locked slides at their original positions.
 * Unlocked slots take remixed content by index; extra remixed slides are ignored.
 */
export function mergeRemixWithLockedSlides(
  original: SlideManifest,
  remixed: SlideManifest
): SlideManifest {
  const slides = original.slides.map((orig, i) => {
    if (orig.locked) return orig;
    const replacement = remixed.slides[i];
    if (!replacement) return orig;
    return { ...replacement, locked: false };
  });

  return {
    ...remixed,
    language: original.language,
    rtl: original.rtl,
    slides: reindexSlides(slides),
  };
}
