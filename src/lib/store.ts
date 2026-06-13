import { create } from "zustand";
import { DEFAULT_THEME_ID } from "@/lib/themes";
import { CUSTOM_THEME_ID } from "@/lib/themes";
import type {
  Audience,
  ChartRecommendation,
  CustomThemePalette,
  InputMode,
  ParsedData,
  DeckStructure,
  SlideManifest,
  Tone,
} from "@/lib/types";

interface BuilderState {
  mode: InputMode;
  description: string;
  slideCount: number;
  tone: Tone;
  audience: Audience;
  themeId: string;
  language: string;

  /** Parsed data file (client-side parse for xlsx/csv, server for pdf). */
  parsedData: ParsedData | null;

  /** AI chart suggestions for the parsed data (user-overridable). */
  chartRecommendations: ChartRecommendation[] | null;

  /** The most recently generated manifest, before persistence. */
  manifest: SlideManifest | null;

  customTheme: CustomThemePalette | null;
  logoDataUrl: string | null;
  logoOnAllSlides: boolean;

  /** Structure extracted from competitor .pptx upload. */
  structureSkeleton: DeckStructure | null;

  brandKitId: string | null;
  headingFont: string;
  bodyFont: string;
  chartColors: string[] | null;

  /** Auto-generate AI images for key slides after outline (up to 3). */
  autoGenerateImages: boolean;
  /** Synthesize chart data when no file was uploaded. */
  autoGenerateChartData: boolean;

  setMode: (mode: InputMode) => void;
  setDescription: (description: string) => void;
  setSlideCount: (count: number) => void;
  setTone: (tone: Tone) => void;
  setAudience: (audience: Audience) => void;
  setThemeId: (themeId: string) => void;
  setLanguage: (language: string) => void;
  setParsedData: (data: ParsedData | null) => void;
  setChartRecommendations: (recs: ChartRecommendation[] | null) => void;
  setManifest: (manifest: SlideManifest | null) => void;
  setCustomTheme: (palette: CustomThemePalette | null) => void;
  setLogoDataUrl: (url: string | null) => void;
  setLogoOnAllSlides: (on: boolean) => void;
  setStructureSkeleton: (skeleton: DeckStructure | null) => void;
  setBrandKitId: (id: string | null) => void;
  setHeadingFont: (font: string) => void;
  setBodyFont: (font: string) => void;
  setChartColors: (colors: string[] | null) => void;
  setAutoGenerateImages: (on: boolean) => void;
  setAutoGenerateChartData: (on: boolean) => void;
  reset: () => void;
}

const initialState = {
  mode: "description" as InputMode,
  description: "",
  slideCount: 10,
  tone: "professional" as Tone,
  audience: "general" as Audience,
  themeId: DEFAULT_THEME_ID,
  language: "en",
  parsedData: null,
  chartRecommendations: null,
  manifest: null,
  customTheme: null,
  logoDataUrl: null,
  logoOnAllSlides: false,
  structureSkeleton: null,
  brandKitId: null,
  headingFont: "Calibri",
  bodyFont: "Calibri",
  chartColors: null,
  autoGenerateImages: true,
  autoGenerateChartData: true,
};

export const useBuilderStore = create<BuilderState>((set) => ({
  ...initialState,
  setMode: (mode) => set({ mode }),
  setDescription: (description) => set({ description }),
  setSlideCount: (slideCount) => set({ slideCount }),
  setTone: (tone) => set({ tone }),
  setAudience: (audience) => set({ audience }),
  setThemeId: (themeId) => set({ themeId }),
  setLanguage: (language) => set({ language }),
  setParsedData: (parsedData) => set({ parsedData }),
  setChartRecommendations: (chartRecommendations) =>
    set({ chartRecommendations }),
  setManifest: (manifest) => set({ manifest }),
  setCustomTheme: (customTheme) =>
    set({ customTheme, themeId: CUSTOM_THEME_ID }),
  setLogoDataUrl: (logoDataUrl) => set({ logoDataUrl }),
  setLogoOnAllSlides: (logoOnAllSlides) => set({ logoOnAllSlides }),
  setStructureSkeleton: (structureSkeleton) => set({ structureSkeleton }),
  setBrandKitId: (brandKitId) => set({ brandKitId }),
  setHeadingFont: (headingFont) => set({ headingFont }),
  setBodyFont: (bodyFont) => set({ bodyFont }),
  setChartColors: (chartColors) => set({ chartColors }),
  setAutoGenerateImages: (autoGenerateImages) => set({ autoGenerateImages }),
  setAutoGenerateChartData: (autoGenerateChartData) =>
    set({ autoGenerateChartData }),
  reset: () => set({ ...initialState }),
}));
