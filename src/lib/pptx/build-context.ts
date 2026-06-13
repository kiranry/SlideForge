import "server-only";

import { safePptxFont } from "@/lib/fonts";
import { DECK_FONT } from "@/lib/layout";

let buildHeadingFont = DECK_FONT;
let buildBodyFont = DECK_FONT;
let buildDeckChartColors: string[] | null = null;
let buildRtl = false;

export function setPptxBuildContext(options?: {
  rtl?: boolean;
  headingFont?: string | null;
  bodyFont?: string | null;
  chartColors?: string[] | null;
}): void {
  buildRtl = options?.rtl ?? false;
  buildBodyFont = safePptxFont(options?.bodyFont);
  buildHeadingFont = safePptxFont(options?.headingFont, buildBodyFont);
  buildDeckChartColors = options?.chartColors?.length ? options.chartColors : null;
}

export function clearPptxBuildContext(): void {
  buildRtl = false;
  buildHeadingFont = DECK_FONT;
  buildBodyFont = DECK_FONT;
  buildDeckChartColors = null;
}

export function pptxRtl(): boolean {
  return buildRtl;
}

export function pptxHeadingFont(): string {
  return buildHeadingFont;
}

export function pptxBodyFont(): string {
  return buildBodyFont;
}

export function pptxChartColors(
  themeChart: string[],
  slideColors?: string[] | null
): string[] {
  if (slideColors?.length) return slideColors;
  if (buildDeckChartColors?.length) return buildDeckChartColors;
  return themeChart;
}
