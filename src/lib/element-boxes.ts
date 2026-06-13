import { DECK, REGIONS, type Box } from "@/lib/layout";
import type { Slide, SlideImage } from "@/lib/types";

export const MIN_BOX_SIZE = { w: 0.45, h: 0.35 } as const;

/** Default quote / insight regions (match pptx render). */
export const QUOTE_TEXT_BOX: Box = {
  x: 1.2,
  y: 2.2,
  w: DECK.widthIn - 2.4,
  h: 2.4,
};

export const QUOTE_ATTR_BOX: Box = {
  x: 1.2,
  y: 4.7,
  w: DECK.widthIn - 2.4,
  h: 0.6,
};

export const INSIGHT_BOX: Box = {
  x: DECK.marginIn,
  y: 2.0,
  w: DECK.widthIn - DECK.marginIn * 2,
  h: 3.5,
};

export const DIVIDER_TITLE_BOX: Box = {
  x: REGIONS.heroTitle.x,
  y: 3.0,
  w: REGIONS.heroTitle.w,
  h: 1.5,
};

export function resolveElementBox(
  elementId: string,
  defaultBox: Box,
  overrides?: Record<string, Box> | null
): Box {
  const custom = overrides?.[elementId];
  if (!custom) return defaultBox;
  return clampBox(custom);
}

export function clampBox(box: Box): Box {
  const w = Math.max(MIN_BOX_SIZE.w, Math.min(box.w, DECK.widthIn));
  const h = Math.max(MIN_BOX_SIZE.h, Math.min(box.h, DECK.heightIn));
  const x = Math.max(0, Math.min(box.x, DECK.widthIn - w));
  const y = Math.max(0, Math.min(box.y, DECK.heightIn - h));
  return { x, y, w, h };
}

export function imageDefaultBox(placement: SlideImage["placement"]): Box {
  if (placement === "hero") {
    return { x: 0, y: 0, w: DECK.widthIn, h: DECK.heightIn };
  }
  if (placement === "inline") {
    return { x: REGIONS.body.x, y: REGIONS.body.y + 3.2, w: 3, h: 1.4 };
  }
  return { ...REGIONS.imageRight };
}

export function setElementBox(slide: Slide, elementId: string, box: Box): Slide {
  return {
    ...slide,
    element_boxes: {
      ...slide.element_boxes,
      [elementId]: clampBox(box),
    },
  };
}

export function clearElementBox(slide: Slide, elementId: string): Slide {
  if (!slide.element_boxes?.[elementId]) return slide;
  const next = { ...slide.element_boxes };
  delete next[elementId];
  return {
    ...slide,
    element_boxes: Object.keys(next).length ? next : undefined,
  };
}

export function clearAllElementBoxes(slide: Slide): Slide {
  if (!slide.element_boxes) return slide;
  return { ...slide, element_boxes: undefined };
}

/** Convert pointer delta (px) to inch delta on the slide. */
export function pointerDeltaToInches(
  dxPx: number,
  dyPx: number,
  previewWidthPx: number
): { dx: number; dy: number } {
  const previewHeightPx = previewWidthPx * (DECK.heightIn / DECK.widthIn);
  return {
    dx: (dxPx / previewWidthPx) * DECK.widthIn,
    dy: (dyPx / previewHeightPx) * DECK.heightIn,
  };
}

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export function applyBoxTransform(
  start: Box,
  handle: "move" | ResizeHandle,
  dx: number,
  dy: number
): Box {
  const { x, y, w, h } = start;
  switch (handle) {
    case "move":
      return clampBox({ x: x + dx, y: y + dy, w, h });
    case "se":
      return clampBox({ x, y, w: w + dx, h: h + dy });
    case "sw":
      return clampBox({ x: x + dx, y, w: w - dx, h: h + dy });
    case "ne":
      return clampBox({ x, y: y + dy, w: w + dx, h: h - dy });
    case "nw":
      return clampBox({ x: x + dx, y: y + dy, w: w - dx, h: h - dy });
    default:
      return clampBox(start);
  }
}
