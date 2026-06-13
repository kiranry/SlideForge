import "server-only";

import { PDFDocument, rgb, type PDFFont, type PDFPage, RGB } from "pdf-lib";
import { DECK } from "@/lib/layout";
import { expandSlidesForExport } from "@/lib/pptx/table-appendix";
import { getTheme, type Theme, type ThemePalette } from "@/lib/themes";
import type { Slide, SlideManifest } from "@/lib/types";
import { StandardFonts } from "pdf-lib";

export type PdfHandoutLayout = "stacked" | "grid";

export interface PdfHandoutOptions {
  includeNotes?: boolean;
  layout?: PdfHandoutLayout;
  customTheme?: ThemePalette | null;
}

const PAGE_W = DECK.widthIn * 72;
const PAGE_H = DECK.heightIn * 72;

function hexRgb(hex: string): RGB {
  const h = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  );
}

function wrapLines(
  text: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawLines(
  page: PDFPage,
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  font: PDFFont,
  color: RGB,
  lineHeight = fontSize * 1.35
): number {
  let cy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: cy, size: fontSize, font, color });
    cy -= lineHeight;
  }
  return cy;
}

function slideBodyLines(slide: Slide): string[] {
  const lines: string[] = [];
  if (slide.subtitle) lines.push(slide.subtitle);

  switch (slide.type) {
    case "kpi":
      for (const k of slide.kpis ?? []) {
        lines.push(`${k.label}: ${k.value}${k.delta ? ` (${k.delta})` : ""}`);
      }
      break;
    case "table":
      if (slide.table) {
        lines.push(slide.table.columns.join(" | "));
        for (const row of slide.table.rows.slice(0, 6)) {
          lines.push(row.join(" | "));
        }
        if (slide.table.rows.length > 6) lines.push("…");
      }
      break;
    case "chart":
      if (slide.chart) {
        lines.push(`Chart: ${slide.chart.type}`);
        if (slide.chart.x_col) lines.push(`X: ${slide.chart.x_col}`);
        if (slide.chart.y_cols?.length) {
          lines.push(`Y: ${slide.chart.y_cols.join(", ")}`);
        }
      }
      break;
    case "comparison":
      if (slide.comparison) {
        lines.push(`${slide.comparison.left.heading}: ${slide.comparison.left.points.join("; ")}`);
        lines.push(`${slide.comparison.right.heading}: ${slide.comparison.right.points.join("; ")}`);
      }
      break;
    case "quote":
      if (slide.quote) {
        lines.push(slide.quote.text);
        if (slide.quote.attribution) lines.push(`— ${slide.quote.attribution}`);
      }
      break;
    case "timeline":
      for (const t of slide.timeline ?? []) {
        lines.push(`${t.label}: ${t.title}${t.description ? ` — ${t.description}` : ""}`);
      }
      break;
    default:
      lines.push(...slide.body);
  }
  return lines;
}

function drawSlideInBox(
  page: PDFPage,
  slide: Slide,
  theme: Theme,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  fonts: { regular: PDFFont; bold: PDFFont },
  includeNotes: boolean
): void {
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    color: hexRgb(theme.background),
  });

  const titleBandH = Math.min(boxH * 0.14, 54);
  page.drawRectangle({
    x: boxX,
    y: boxY + boxH - titleBandH,
    width: boxW,
    height: titleBandH,
    color: hexRgb(theme.palette.primary),
  });

  const titleSize = Math.max(10, Math.min(18, boxW / 28));
  const titleLines = wrapLines(slide.title, boxW - 24, titleSize, fonts.bold);
  let ty = boxY + boxH - titleBandH + (titleBandH - titleSize) / 2;
  for (const line of titleLines.slice(0, 2)) {
    page.drawText(line, {
      x: boxX + 12,
      y: ty,
      size: titleSize,
      font: fonts.bold,
      color: rgb(1, 1, 1),
    });
    ty -= titleSize * 1.1;
  }

  const notesH = includeNotes && slide.speaker_notes ? boxH * 0.22 : 0;
  const bodyTop = boxY + boxH - titleBandH - 8;
  const bodyBottom = boxY + notesH + 8;
  const bodySize = Math.max(8, Math.min(11, boxW / 45));
  const bodyLines = slideBodyLines(slide);
  let by = bodyTop;
  for (const raw of bodyLines) {
    const wrapped = wrapLines(raw, boxW - 24, bodySize, fonts.regular);
    for (const line of wrapped) {
      if (by < bodyBottom) break;
      page.drawText(line, {
        x: boxX + 12,
        y: by,
        size: bodySize,
        font: fonts.regular,
        color: hexRgb(theme.body),
      });
      by -= bodySize * 1.35;
    }
    if (by < bodyBottom) break;
  }

  if (notesH > 0 && slide.speaker_notes) {
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: notesH,
      color: hexRgb(theme.surface),
    });
    const noteSize = Math.max(7, bodySize - 1);
    const noteLines = wrapLines(
      `Notes: ${slide.speaker_notes}`,
      boxW - 24,
      noteSize,
      fonts.regular
    );
    drawLines(
      page,
      noteLines.slice(0, 4),
      boxX + 12,
      boxY + notesH - noteSize - 4,
      noteSize,
      fonts.regular,
      hexRgb(theme.muted)
    );
  }

  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxW,
    height: boxH,
    borderColor: hexRgb(theme.surface),
    borderWidth: 0.5,
  });
}

export async function buildPdfHandout(
  manifest: SlideManifest,
  options?: PdfHandoutOptions
): Promise<Buffer> {
  const theme = getTheme(manifest.theme, options?.customTheme);
  const includeNotes = options?.includeNotes ?? false;
  const layout = options?.layout ?? "stacked";
  const slides = expandSlidesForExport(manifest.slides);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(manifest.title);
  pdfDoc.setCreator("SlideForge");

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  if (layout === "grid") {
    const miniW = PAGE_W / 2;
    const miniH = miniW * (9 / 16);
    const yOffset = (PAGE_H - miniH) / 2;

    for (let i = 0; i < slides.length; i += 2) {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      drawSlideInBox(
        page,
        slides[i],
        theme,
        0,
        yOffset,
        miniW,
        miniH,
        fonts,
        false
      );
      if (slides[i + 1]) {
        drawSlideInBox(
          page,
          slides[i + 1],
          theme,
          miniW,
          yOffset,
          miniW,
          miniH,
          fonts,
          false
        );
      }
    }
  } else {
    for (const slide of slides) {
      const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      const slideH = includeNotes ? PAGE_H * 0.78 : PAGE_H;
      const slideY = PAGE_H - slideH;
      drawSlideInBox(
        page,
        slide,
        theme,
        0,
        slideY,
        PAGE_W,
        slideH,
        fonts,
        includeNotes
      );
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
