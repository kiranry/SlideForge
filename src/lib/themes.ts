/**
 * Deck design themes. These describe the look of the *generated presentation*
 * (not the app chrome). Both the HTML previewer and the pptxgenjs renderer
 * read these tokens so the preview matches the exported .pptx.
 *
 * All colors are 6-digit hex WITHOUT the leading "#", because pptxgenjs expects
 * that form. Use `withHash()` for CSS.
 */

export interface ThemePalette {
  /** Source brand colors as specified in the PRD. */
  primary: string;
  secondary: string;
  accent: string;
}

export interface Theme {
  id: string;
  name: string;
  bestFor: string;
  palette: ThemePalette;
  /** Rendering roles (resolved colors used by both renderers). */
  background: string;
  surface: string;
  title: string;
  body: string;
  muted: string;
  /** Color used behind full-bleed dividers. */
  dividerBg: string;
  /** Text color on the divider background. */
  dividerText: string;
  /** Ordered chart series palette. */
  chart: string[];
}

/** Prepend "#" for use in CSS / web contexts. */
export function withHash(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

export const THEMES: Theme[] = [
  {
    id: "midnight-executive",
    name: "Midnight Executive",
    bestFor: "Finance, Corporate",
    palette: { primary: "1E2761", secondary: "CADCFC", accent: "FFFFFF" },
    background: "FFFFFF",
    surface: "F3F6FD",
    title: "1E2761",
    body: "2B3043",
    muted: "6B7280",
    dividerBg: "1E2761",
    dividerText: "FFFFFF",
    chart: ["1E2761", "4156A6", "8AA0D8", "CADCFC", "B08D57"],
  },
  {
    id: "coral-energy",
    name: "Coral Energy",
    bestFor: "Startups, Marketing",
    palette: { primary: "F96167", secondary: "F9E795", accent: "2F3C7E" },
    background: "FFFFFF",
    surface: "FFF6F0",
    title: "2F3C7E",
    body: "3A3A45",
    muted: "8A8A93",
    dividerBg: "F96167",
    dividerText: "FFFFFF",
    chart: ["F96167", "2F3C7E", "F9C04A", "5563A8", "F98F93"],
  },
  {
    id: "forest-moss",
    name: "Forest & Moss",
    bestFor: "Sustainability, NGO",
    palette: { primary: "2C5F2D", secondary: "97BC62", accent: "F5F5F5" },
    background: "FFFFFF",
    surface: "F1F5EC",
    title: "2C5F2D",
    body: "2E332A",
    muted: "6E7568",
    dividerBg: "2C5F2D",
    dividerText: "F5F5F5",
    chart: ["2C5F2D", "97BC62", "5C8A3A", "C2D6A0", "A47148"],
  },
  {
    id: "charcoal-minimal",
    name: "Charcoal Minimal",
    bestFor: "Technical, SaaS",
    palette: { primary: "36454F", secondary: "F2F2F2", accent: "212121" },
    background: "FFFFFF",
    surface: "F5F6F7",
    title: "212121",
    body: "36454F",
    muted: "7A858C",
    dividerBg: "212121",
    dividerText: "F2F2F2",
    chart: ["36454F", "6B7C85", "212121", "A9B4BA", "C08552"],
  },
  {
    id: "warm-terracotta",
    name: "Warm Terracotta",
    bestFor: "Consulting, Strategy",
    palette: { primary: "B85042", secondary: "E7E8D1", accent: "A7BEAE" },
    background: "FBFAF5",
    surface: "F3F1E4",
    title: "B85042",
    body: "433A33",
    muted: "8A7F73",
    dividerBg: "B85042",
    dividerText: "FBFAF5",
    chart: ["B85042", "A7BEAE", "D08C7A", "7E9483", "E0C36B"],
  },
  {
    id: "ocean-gradient",
    name: "Ocean Gradient",
    bestFor: "Healthcare, Research",
    palette: { primary: "065A82", secondary: "1C7293", accent: "21295C" },
    background: "FFFFFF",
    surface: "EEF5F8",
    title: "21295C",
    body: "2A3B44",
    muted: "6A7C84",
    dividerBg: "065A82",
    dividerText: "FFFFFF",
    chart: ["065A82", "1C7293", "21295C", "4FA3C7", "9BC4D6"],
  },
  {
    id: "berry-cream",
    name: "Berry & Cream",
    bestFor: "Creative, Brand",
    palette: { primary: "6D2E46", secondary: "A26769", accent: "ECE2D0" },
    background: "FBF7F0",
    surface: "F3EADD",
    title: "6D2E46",
    body: "3F3035",
    muted: "8C7A72",
    dividerBg: "6D2E46",
    dividerText: "ECE2D0",
    chart: ["6D2E46", "A26769", "C99DA0", "8C5A6B", "D4B483"],
  },
];

export const DEFAULT_THEME_ID = "midnight-executive";

/** Themes shipped in the Phase 1 MVP (PRD Section 13). */
export const MVP_THEME_IDS = [
  "midnight-executive",
  "coral-energy",
  "charcoal-minimal",
];

const THEME_MAP: Record<string, Theme> = Object.fromEntries(
  THEMES.map((t) => [t.id, t])
);

export const CUSTOM_THEME_ID = "custom";

/** Build a full Theme from user-supplied primary/secondary/accent hex (no #). */
export function buildCustomTheme(palette: ThemePalette, name = "Custom"): Theme {
  return {
    id: CUSTOM_THEME_ID,
    name,
    bestFor: "Your brand",
    palette,
    background: "FFFFFF",
    surface: palette.accent.length === 6 ? palette.accent : "F5F5F5",
    title: palette.primary,
    body: palette.primary,
    muted: "6B7280",
    dividerBg: palette.primary,
    dividerText: palette.accent,
    chart: [palette.primary, palette.secondary, palette.accent, palette.primary, palette.secondary],
  };
}

export function getTheme(
  id: string | undefined,
  customPalette?: ThemePalette | null
): Theme {
  if (id === CUSTOM_THEME_ID && customPalette) {
    return buildCustomTheme(customPalette);
  }
  return (id && THEME_MAP[id]) || THEME_MAP[DEFAULT_THEME_ID];
}
