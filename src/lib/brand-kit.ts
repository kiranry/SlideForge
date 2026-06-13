import type { CustomThemePalette } from "@/lib/types";

export interface BrandKit {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  palette: CustomThemePalette;
  headingFont?: string;
  bodyFont?: string;
  /** Default chart series colors (hex without #). */
  chartColors?: string[];
  logoDataUrl?: string | null;
  logoOnAllSlides?: boolean;
}

export function defaultBrandKit(name = "My brand"): BrandKit {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    updatedAt: now,
    palette: { primary: "1E2761", secondary: "CADCFC", accent: "FFFFFF" },
    headingFont: "Calibri",
    bodyFont: "Calibri",
    chartColors: ["1E2761", "CADCFC", "4A6FA5", "6B7280", "FFFFFF"],
    logoDataUrl: null,
    logoOnAllSlides: false,
  };
}
