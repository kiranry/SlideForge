import { DECK } from "@/lib/layout";

const ASPECT = DECK.widthIn / DECK.heightIn;

/** Fit a 16:9 slide inside a container without exceeding bounds. */
export function fitSlideStageSize(
  containerWidth: number,
  containerHeight: number
): { width: number; height: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { width: 720, height: Math.round(720 / ASPECT) };
  }

  let width = containerWidth;
  let height = width / ASPECT;
  if (height > containerHeight) {
    height = containerHeight;
    width = height * ASPECT;
  }

  return { width: Math.floor(width), height: Math.floor(height) };
}
