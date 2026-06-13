/**
 * Shared layout spec — the contract that keeps the HTML preview and the
 * pptxgenjs export visually identical.
 *
 * Geometry is expressed in INCHES because that is pptxgenjs's native unit
 * (16:9 deck = 10" x 7.5"). Font sizes are in POINTS (pptx native). The helper
 * functions convert these into CSS percentages / scaled pixels so the web
 * preview maps 1:1 onto the exported slide.
 */

export const DECK = {
  /**
   * True 16:9 widescreen (PowerPoint's modern default = LAYOUT_WIDE).
   * Note: the PRD says "16:9 (10x7.5)" but 10x7.5 is actually 4:3; we use the
   * real 16:9 geometry so the preview and export share one aspect ratio.
   */
  widthIn: 13.333,
  heightIn: 7.5,
  marginIn: 0.6,
  /** Points per inch (PowerPoint convention). */
  ptPerInch: 72,
} as const;

export type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const contentW = DECK.widthIn - DECK.marginIn * 2;

/** Named regions used by both renderers, in inches. */
export const REGIONS = {
  /** Standard content slide: title band + body area. */
  title: { x: DECK.marginIn, y: DECK.marginIn, w: contentW, h: 1.0 },
  subtitle: { x: DECK.marginIn, y: DECK.marginIn + 1.0, w: contentW, h: 0.6 },
  body: { x: DECK.marginIn, y: 1.95, w: contentW, h: 4.6 },
  footer: { x: DECK.marginIn, y: 7.0, w: contentW, h: 0.35 },

  /** Hero (title slide): vertically centered block. */
  heroTitle: { x: DECK.marginIn, y: 2.7, w: contentW, h: 1.6 },
  heroSubtitle: { x: DECK.marginIn, y: 4.3, w: contentW, h: 0.8 },

  /** Two-column body. */
  colLeft: { x: DECK.marginIn, y: 1.95, w: contentW / 2 - 0.2, h: 4.6 },
  colRight: {
    x: DECK.marginIn + contentW / 2 + 0.2,
    y: 1.95,
    w: contentW / 2 - 0.2,
    h: 4.6,
  },

  /** Chart area beneath a title. */
  chart: { x: DECK.marginIn, y: 1.95, w: contentW, h: 4.6 },

  /** Body text when a chart sits beside it on the same slide. */
  bodyText: { x: DECK.marginIn, y: 1.95, w: contentW * 0.52, h: 4.6 },
  /** Chart beside body text (non-chart slide types). */
  chartAside: {
    x: DECK.marginIn + contentW * 0.55,
    y: 1.95,
    w: contentW * 0.42,
    h: 4.6,
  },
  /** Right-rail image on any slide. */
  imageRight: {
    x: DECK.widthIn - DECK.marginIn - 2.15,
    y: 0.45,
    w: 2.0,
    h: 1.55,
  },
} as const satisfies Record<string, Box>;

/** Font sizes in points. */
export const FONT_PT = {
  heroTitle: 44,
  heroSubtitle: 22,
  title: 30,
  subtitle: 18,
  body: 16,
  bodyDense: 13,
  kpiValue: 40,
  kpiLabel: 14,
  quote: 28,
  attribution: 16,
  footer: 10,
  tableHeader: 13,
  tableCell: 12,
} as const;

/** Output font stack — cross-platform safe per PRD Section 4.3. */
export const DECK_FONT = "Calibri";

/* ----------------------------------------------------------------------------
 * Conversion helpers
 * ------------------------------------------------------------------------- */

export const pctX = (inches: number): number => (inches / DECK.widthIn) * 100;
export const pctY = (inches: number): number => (inches / DECK.heightIn) * 100;

/** A box as CSS percentage positioning (for absolutely-positioned preview). */
export function boxToCssPct(box: Box): {
  left: string;
  top: string;
  width: string;
  height: string;
} {
  return {
    left: `${pctX(box.x)}%`,
    top: `${pctY(box.y)}%`,
    width: `${pctX(box.w)}%`,
    height: `${pctY(box.h)}%`,
  };
}

/**
 * Convert a point font size to a CSS pixel size for a preview rendered at
 * `previewWidthPx`. Keeps preview type proportional to the real slide.
 */
export function ptToPreviewPx(pt: number, previewWidthPx: number): number {
  const slideWidthPt = DECK.widthIn * DECK.ptPerInch; // 720pt
  return (pt / slideWidthPt) * previewWidthPx;
}
