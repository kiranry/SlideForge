import { DECK_FONT } from "@/lib/layout";

/** Fonts pptxgenjs can embed reliably on most systems. */
export const SAFE_PPTX_FONTS = [
  "Calibri",
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Verdana",
  "Tahoma",
  "Courier New",
] as const;

export type SafePptxFont = (typeof SAFE_PPTX_FONTS)[number];

const CSS_STACKS: Record<string, string> = {
  Calibri: "Calibri, 'Segoe UI', sans-serif",
  Arial: "Arial, Helvetica, sans-serif",
  Helvetica: "Helvetica, Arial, sans-serif",
  Georgia: "Georgia, 'Times New Roman', serif",
  "Times New Roman": "'Times New Roman', Times, serif",
  Verdana: "Verdana, Geneva, sans-serif",
  Tahoma: "Tahoma, Geneva, sans-serif",
  "Courier New": "'Courier New', Courier, monospace",
};

export function safePptxFont(name?: string | null, fallback = DECK_FONT): string {
  if (!name?.trim()) return fallback;
  const match = SAFE_PPTX_FONTS.find(
    (f) => f.toLowerCase() === name.trim().toLowerCase()
  );
  return match ?? fallback;
}

export function cssFontStack(name?: string | null): string {
  const safe = safePptxFont(name);
  return CSS_STACKS[safe] ?? CSS_STACKS.Calibri;
}
