import "server-only";
import pptxgen from "pptxgenjs";
import { DECK, REGIONS, FONT_PT } from "@/lib/layout";
import {
  clearPptxBuildContext,
  pptxBodyFont,
  pptxHeadingFont,
  pptxRtl,
  setPptxBuildContext,
} from "./build-context";
import {
  DIVIDER_TITLE_BOX,
  QUOTE_ATTR_BOX,
  QUOTE_TEXT_BOX,
  imageDefaultBox,
  resolveElementBox,
} from "@/lib/element-boxes";
import { getTheme, type Theme, type ThemePalette } from "@/lib/themes";
import type {
  AnomalyFlag,
  ParsedData,
  Slide,
  SlideManifest,
} from "@/lib/types";

export interface PptxBuildOptions {
  customTheme?: ThemePalette | null;
  logoDataUrl?: string | null;
  logoOnAllSlides?: boolean;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  headingFont?: string | null;
  bodyFont?: string | null;
  chartColors?: string[] | null;
}
import { addChartToSlide, addAnomalyCallouts } from "./charts";
import {
  expandSlidesForExport,
  TABLE_MAIN_ROWS,
} from "./table-appendix";

type PptxSlide = ReturnType<pptxgen["addSlide"]>;

function tx<T extends pptxgen.TextPropsOptions>(opts: T): T {
  return pptxRtl() ? ({ ...opts, rtlMode: true } as T) : opts;
}

/** Build a .pptx as a Node Buffer from a validated manifest. */
export async function buildPptx(
  manifest: SlideManifest,
  data?: ParsedData | null,
  options?: PptxBuildOptions
): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.defineLayout({ name: "SF16x9", width: DECK.widthIn, height: DECK.heightIn });
  pptx.layout = "SF16x9";
  pptx.author = "SlideForge";
  pptx.title = manifest.title;

  const theme = getTheme(manifest.theme, options?.customTheme);
  const logo = options?.logoDataUrl;
  const logoAll = options?.logoOnAllSlides ?? false;
  setPptxBuildContext({
    rtl: manifest.rtl ?? false,
    headingFont: options?.headingFont,
    bodyFont: options?.bodyFont,
    chartColors: options?.chartColors,
  });

  const exportSlides = expandSlidesForExport(manifest.slides);

  for (const slide of exportSlides) {
    const s = pptx.addSlide();
    s.background = { color: theme.background };
    renderSlide(s, slide, theme, data, options);
    if (slide.type === "title" && logo) addLogo(s, logo, "title");
    else if (logoAll && logo) addLogo(s, logo, "footer");
    if (slide.speaker_notes) s.addNotes(slide.speaker_notes);
  }

  clearPptxBuildContext();
  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}

function addSlideImage(s: PptxSlide, slide: Slide) {
  const image = slide.image;
  if (!image?.dataUrl) return;
  const box = resolveElementBox(
    "image",
    imageDefaultBox(image.placement),
    slide.element_boxes
  );
  try {
    s.addImage({ data: image.dataUrl, ...box });
  } catch {
    /* skip invalid image */
  }
}

function addLogo(s: PptxSlide, dataUrl: string, placement: "title" | "footer") {
  const opts =
    placement === "title"
      ? { x: DECK.widthIn - 1.8, y: 0.35, w: 1.4, h: 0.7 }
      : { x: DECK.widthIn - 1.2, y: DECK.heightIn - 0.55, w: 0.9, h: 0.45 };
  try {
    s.addImage({ data: dataUrl, ...opts });
  } catch {
    /* skip invalid logo data */
  }
}

function renderSlide(
  s: PptxSlide,
  slide: Slide,
  theme: Theme,
  data?: ParsedData | null,
  options?: PptxBuildOptions
) {
  switch (slide.type) {
    case "title":
      renderTitle(s, slide, theme);
      break;
    case "divider":
      renderDivider(s, slide, theme);
      break;
    case "closing":
      renderClosing(s, slide, theme);
      break;
    case "kpi":
      renderKpi(s, slide, theme);
      break;
    case "comparison":
      renderComparison(s, slide, theme);
      break;
    case "quote":
      renderQuote(s, slide, theme);
      break;
    case "timeline":
      renderTimeline(s, slide, theme);
      break;
    case "table":
      renderTable(s, slide, theme);
      break;
    case "chart":
      renderChart(s, slide, theme, data, options);
      break;
    case "content":
    default:
      renderContent(s, slide, theme);
      break;
  }
  renderSlideEmbeds(s, slide, theme, data, options);
}

/** Charts/images on any slide type (except full chart slides handle their own chart). */
function renderSlideEmbeds(
  s: PptxSlide,
  slide: Slide,
  theme: Theme,
  data?: ParsedData | null,
  options?: PptxBuildOptions
) {
  if (slide.image) addSlideImage(s, slide);
  if (slide.chart && data && slide.type !== "chart") {
    const chartBox = resolveElementBox(
      "chartAside",
      REGIONS.chartAside,
      slide.element_boxes
    );
    const added = addChartToSlide(s, slide, theme, data, chartBox);
    if (added && options?.anomalyFlags?.length) {
      addAnomalyCallouts(
        s,
        slide,
        data,
        options.anomalyFlags,
        options.suppressedAnomalyIds ?? []
      );
    }
  }
}

/* ----------------------------------------------------------------------------
 * Shared pieces
 * ------------------------------------------------------------------------- */

function addTitleBand(s: PptxSlide, slide: Slide, theme: Theme) {
  const titleBox = resolveElementBox("title", REGIONS.title, slide.element_boxes);
  s.addText(slide.title, tx({
    x: titleBox.x,
    y: titleBox.y,
    w: titleBox.w,
    h: titleBox.h,
    fontFace: pptxHeadingFont(),
    fontSize: FONT_PT.title,
    bold: true,
    color: theme.title,
    align: "left",
    valign: "middle",
  }));
  // Accent rule under the title.
  s.addShape("rect", {
    x: titleBox.x,
    y: titleBox.y + titleBox.h + 0.02,
    w: 1.4,
    h: 0.06,
    fill: { color: theme.palette.primary },
  });
}

function addFooter(s: PptxSlide, slide: Slide, theme: Theme) {
  s.addText(`${slide.index}`, tx({
    x: DECK.widthIn - 1.1,
    y: REGIONS.footer.y,
    w: 0.5,
    h: REGIONS.footer.h,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.footer,
    color: theme.muted,
    align: "right",
  }));
}

function bulletsToText(body: string[]) {
  return body.map((line) => ({
    text: line,
    options: tx({ bullet: true }),
  }));
}

/* ----------------------------------------------------------------------------
 * Slide renderers
 * ------------------------------------------------------------------------- */

function renderTitle(s: PptxSlide, slide: Slide, theme: Theme) {
  s.addShape("rect", {
    x: 0,
    y: DECK.heightIn - 0.25,
    w: DECK.widthIn,
    h: 0.25,
    fill: { color: theme.palette.primary },
  });
  const heroTitle = resolveElementBox("heroTitle", REGIONS.heroTitle, slide.element_boxes);
  s.addText(slide.title, {
    x: heroTitle.x,
    y: heroTitle.y,
    w: heroTitle.w,
    h: heroTitle.h,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.heroTitle,
    bold: true,
    color: theme.title,
    align: "left",
    valign: "bottom",
  });
  if (slide.subtitle) {
    const heroSub = resolveElementBox(
      "heroSubtitle",
      REGIONS.heroSubtitle,
      slide.element_boxes
    );
    s.addText(slide.subtitle, {
      x: heroSub.x,
      y: heroSub.y,
      w: heroSub.w,
      h: heroSub.h,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.heroSubtitle,
      color: theme.body,
      align: "left",
      valign: "top",
    });
  }
}

function renderDivider(s: PptxSlide, slide: Slide, theme: Theme) {
  s.background = { color: theme.dividerBg };
  const titleBox = resolveElementBox(
    "dividerTitle",
    DIVIDER_TITLE_BOX,
    slide.element_boxes
  );
  s.addText(slide.title, {
    x: titleBox.x,
    y: titleBox.y,
    w: titleBox.w,
    h: titleBox.h,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.heroTitle,
    bold: true,
    color: theme.dividerText,
    align: "left",
    valign: "middle",
  });
}

function renderClosing(s: PptxSlide, slide: Slide, theme: Theme) {
  s.background = { color: theme.dividerBg };
  s.addText(slide.title, {
    x: REGIONS.heroTitle.x,
    y: 2.8,
    w: REGIONS.heroTitle.w,
    h: 1.4,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.heroTitle,
    bold: true,
    color: theme.dividerText,
    align: "left",
    valign: "middle",
  });
  if (slide.subtitle || slide.body.length) {
    s.addText(slide.subtitle ?? slide.body.join("  •  "), {
      x: REGIONS.heroSubtitle.x,
      y: 4.3,
      w: REGIONS.heroSubtitle.w,
      h: 0.8,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.heroSubtitle,
      color: theme.dividerText,
      align: "left",
    });
  }
}

function renderContent(s: PptxSlide, slide: Slide, theme: Theme) {
  addTitleBand(s, slide, theme);
  const defaultBody = slide.chart ? REGIONS.bodyText : REGIONS.body;
  const bodyBox = resolveElementBox("body", defaultBody, slide.element_boxes);
  const region =
    slide.layout_hint === "two_col" && !slide.chart
      ? splitColumns(s, slide, theme)
      : null;
  if (!region) {
    s.addText(bulletsToText(slide.body), {
      x: bodyBox.x,
      y: bodyBox.y,
      w: bodyBox.w,
      h: bodyBox.h,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.body,
      color: theme.body,
      align: "left",
      valign: "top",
      lineSpacingMultiple: 1.3,
      paraSpaceAfter: 8,
    });
  }
  addFooter(s, slide, theme);
}

function splitColumns(s: PptxSlide, slide: Slide, theme: Theme): boolean {
  const mid = Math.ceil(slide.body.length / 2);
  const left = slide.body.slice(0, mid);
  const right = slide.body.slice(mid);
  const leftBox = resolveElementBox("colLeft", REGIONS.colLeft, slide.element_boxes);
  const rightBox = resolveElementBox("colRight", REGIONS.colRight, slide.element_boxes);
  s.addText(bulletsToText(left), {
    ...leftBox,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.body,
    color: theme.body,
    valign: "top",
    lineSpacingMultiple: 1.3,
    paraSpaceAfter: 8,
  });
  s.addText(bulletsToText(right), {
    ...rightBox,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.body,
    color: theme.body,
    valign: "top",
    lineSpacingMultiple: 1.3,
    paraSpaceAfter: 8,
  });
  return true;
}

function renderKpi(s: PptxSlide, slide: Slide, theme: Theme) {
  addTitleBand(s, slide, theme);
  const kpis = (slide.kpis ?? []).slice(0, 4);
  const bodyBox = resolveElementBox("body", REGIONS.body, slide.element_boxes);
  const n = kpis.length || 1;
  const gap = 0.3;
  const totalW = bodyBox.w;
  const cardW = (totalW - gap * (n - 1)) / n;
  kpis.forEach((kpi, i) => {
    const x = bodyBox.x + i * (cardW + gap);
    s.addShape("roundRect", {
      x,
      y: bodyBox.y + 0.3,
      w: cardW,
      h: 2.8,
      fill: { color: theme.surface },
      line: { color: theme.palette.primary, width: 0.75 },
      rectRadius: 0.08,
    });
    s.addText(kpi.value, {
      x: x + 0.15,
      y: bodyBox.y + 0.7,
      w: cardW - 0.3,
      h: 1.2,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.kpiValue,
      bold: true,
      color: theme.palette.primary,
      align: "center",
    });
    s.addText(
      [
        { text: kpi.label, options: { bold: true, color: theme.title } },
        ...(kpi.delta
          ? [{ text: `\n${kpi.delta}`, options: { color: theme.muted, fontSize: 12 } }]
          : []),
      ],
      {
        x: x + 0.15,
        y: bodyBox.y + 1.9,
        w: cardW - 0.3,
        h: 0.9,
        fontFace: pptxBodyFont(),
        fontSize: FONT_PT.kpiLabel,
        align: "center",
        valign: "top",
      }
    );
  });
  addFooter(s, slide, theme);
}

function renderComparison(s: PptxSlide, slide: Slide, theme: Theme) {
  addTitleBand(s, slide, theme);
  const c = slide.comparison;
  if (!c) return renderContent(s, slide, theme);
  const cols = [
    {
      id: "colLeft" as const,
      col: resolveElementBox("colLeft", REGIONS.colLeft, slide.element_boxes),
      data: c.left,
    },
    {
      id: "colRight" as const,
      col: resolveElementBox("colRight", REGIONS.colRight, slide.element_boxes),
      data: c.right,
    },
  ];
  for (const { col, data } of cols) {
    s.addShape("rect", {
      x: col.x,
      y: col.y,
      w: col.w,
      h: 0.6,
      fill: { color: theme.palette.primary },
    });
    s.addText(data.heading, {
      x: col.x + 0.15,
      y: col.y,
      w: col.w - 0.3,
      h: 0.6,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.subtitle,
      bold: true,
      color: theme.background,
      valign: "middle",
    });
    s.addText(bulletsToText(data.points), {
      x: col.x + 0.1,
      y: col.y + 0.8,
      w: col.w - 0.2,
      h: col.h - 0.8,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.body,
      color: theme.body,
      valign: "top",
      lineSpacingMultiple: 1.25,
      paraSpaceAfter: 6,
    });
  }
  addFooter(s, slide, theme);
}

function renderQuote(s: PptxSlide, slide: Slide, theme: Theme) {
  const q = slide.quote;
  const quoteBox = resolveElementBox("quote", QUOTE_TEXT_BOX, slide.element_boxes);
  s.addText(`“${q?.text ?? slide.title}”`, {
    x: quoteBox.x,
    y: quoteBox.y,
    w: quoteBox.w,
    h: quoteBox.h,
    fontFace: pptxBodyFont(),
    fontSize: FONT_PT.quote,
    italic: true,
    color: theme.title,
    align: "left",
    valign: "middle",
  });
  if (q?.attribution) {
    const attrBox = resolveElementBox(
      "quoteAttribution",
      QUOTE_ATTR_BOX,
      slide.element_boxes
    );
    s.addText(`— ${q.attribution}`, {
      x: attrBox.x,
      y: attrBox.y,
      w: attrBox.w,
      h: attrBox.h,
      fontFace: pptxBodyFont(),
      fontSize: FONT_PT.attribution,
      color: theme.muted,
    });
  }
  addFooter(s, slide, theme);
}

function renderTimeline(s: PptxSlide, slide: Slide, theme: Theme) {
  addTitleBand(s, slide, theme);
  const items = slide.timeline ?? [];
  const bodyBox = resolveElementBox("body", REGIONS.body, slide.element_boxes);
  const n = items.length || 1;
  const lineY = bodyBox.y + 1.65;
  s.addShape("line", {
    x: bodyBox.x,
    y: lineY,
    w: bodyBox.w,
    h: 0,
    line: { color: theme.palette.primary, width: 2 },
  });
  const step = bodyBox.w / n;
  items.forEach((item, i) => {
    const cx = bodyBox.x + step * i + step / 2;
    s.addShape("ellipse", {
      x: cx - 0.08,
      y: lineY - 0.08,
      w: 0.16,
      h: 0.16,
      fill: { color: theme.palette.primary },
    });
    s.addText(item.label, {
      x: cx - step / 2 + 0.1,
      y: lineY - 1.0,
      w: step - 0.2,
      h: 0.4,
      fontFace: pptxBodyFont(),
      fontSize: 12,
      bold: true,
      color: theme.palette.primary,
      align: "center",
    });
    s.addText(
      [
        { text: item.title, options: { bold: true, color: theme.title } },
        ...(item.description
          ? [{ text: `\n${item.description}`, options: { color: theme.body, fontSize: 11 } }]
          : []),
      ],
      {
        x: cx - step / 2 + 0.1,
        y: lineY + 0.3,
        w: step - 0.2,
        h: 1.6,
        fontFace: pptxBodyFont(),
        fontSize: 13,
        align: "center",
        valign: "top",
      }
    );
  });
  addFooter(s, slide, theme);
}

function renderTable(s: PptxSlide, slide: Slide, theme: Theme) {
  addTitleBand(s, slide, theme);
  const t = slide.table;
  if (!t) return renderContent(s, slide, theme);
  const headerRow = t.columns.map((c) => ({
    text: c,
    options: {
      bold: true,
      color: theme.background,
      fill: { color: theme.palette.primary },
      fontSize: FONT_PT.tableHeader,
      align: "left" as const,
    },
  }));
  const bodyRows = t.rows.slice(0, TABLE_MAIN_ROWS).map((row, ri) =>
    row.map((cell) => ({
      text: String(cell ?? ""),
      options: {
        color: theme.body,
        fill: { color: ri % 2 === 0 ? theme.background : theme.surface },
        fontSize: FONT_PT.tableCell,
        align: "left" as const,
      },
    }))
  );
  const bodyBox = resolveElementBox("body", REGIONS.body, slide.element_boxes);
  s.addTable([headerRow, ...bodyRows], {
    x: bodyBox.x,
    y: bodyBox.y,
    w: bodyBox.w,
    fontFace: pptxBodyFont(),
    border: { type: "solid", color: theme.surface, pt: 1 },
    valign: "middle",
    rowH: 0.35,
  });
  if (t.truncated || t.rows.length > TABLE_MAIN_ROWS) {
    s.addText("See appendix for full data.", {
      x: REGIONS.body.x,
      y: 6.5,
      w: REGIONS.body.w,
      h: 0.3,
      fontFace: pptxBodyFont(),
      fontSize: 11,
      italic: true,
      color: theme.muted,
    });
  }
  addFooter(s, slide, theme);
}

function renderChart(
  s: PptxSlide,
  slide: Slide,
  theme: Theme,
  data?: ParsedData | null,
  options?: PptxBuildOptions
) {
  addTitleBand(s, slide, theme);
  const chartBox = resolveElementBox("chart", REGIONS.chart, slide.element_boxes);
  const added = addChartToSlide(s, slide, theme, data, chartBox);
  if (added && data && options?.anomalyFlags?.length) {
    addAnomalyCallouts(
      s,
      slide,
      data,
      options.anomalyFlags,
      options.suppressedAnomalyIds ?? []
    );
  }
  if (!added) {
    // Fallback: render body bullets if the chart could not be built.
    s.addText(
      bulletsToText(slide.body.length ? slide.body : ["(chart data unavailable)"]),
      {
        ...resolveElementBox("chart", REGIONS.chart, slide.element_boxes),
        fontFace: pptxBodyFont(),
        fontSize: FONT_PT.body,
        color: theme.body,
        valign: "top",
      }
    );
  }
  addFooter(s, slide, theme);
}
