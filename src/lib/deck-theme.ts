import { cssFontStack } from "@/lib/fonts";
import { getTheme, type Theme } from "@/lib/themes";
import type { CustomThemePalette, Slide } from "@/lib/types";

export interface ResolvedDeckTheme {
  theme: Theme;
  headingFont: string;
  bodyFont: string;
  headingFontCss: string;
  bodyFontCss: string;
  chartColors: string[];
}

/** Chart colors: per-slide override → deck kit → theme default. */
export function chartColorsForSlide(
  slide: Slide,
  theme: Theme,
  deckChartColors?: string[] | null
): string[] {
  if (slide.chart?.colors?.length) return slide.chart.colors;
  if (deckChartColors?.length) return deckChartColors;
  return theme.chart;
}

export function resolveDeckTheme(deck: {
  manifest: { theme: string };
  customTheme?: CustomThemePalette | null;
  headingFont?: string | null;
  bodyFont?: string | null;
  chartColors?: string[] | null;
}): ResolvedDeckTheme {
  const theme = getTheme(deck.manifest.theme, deck.customTheme);
  const headingFont = deck.headingFont?.trim() || "Calibri";
  const bodyFont = deck.bodyFont?.trim() || headingFont;
  const chartColors =
    deck.chartColors?.length ? deck.chartColors : theme.chart;

  return {
    theme: { ...theme, chart: chartColors },
    headingFont,
    bodyFont,
    headingFontCss: cssFontStack(headingFont),
    bodyFontCss: cssFontStack(bodyFont),
    chartColors,
  };
}
