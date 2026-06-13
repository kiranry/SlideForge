"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DECK, REGIONS, FONT_PT, boxToCssPct, ptToPreviewPx } from "@/lib/layout";
import {
  DIVIDER_TITLE_BOX,
  INSIGHT_BOX,
  QUOTE_ATTR_BOX,
  QUOTE_TEXT_BOX,
  imageDefaultBox,
} from "@/lib/element-boxes";
import { chartColorsForSlide } from "@/lib/deck-theme";
import { cssFontStack } from "@/lib/fonts";
import { getTheme, withHash, type Theme } from "@/lib/themes";
import { resolveChartData } from "@/lib/chart-data";
import { TABLE_MAIN_ROWS } from "@/lib/pptx/table-appendix";
import { anomaliesForChart } from "@/lib/anomalies";
import { EditableBullets, EditableText } from "@/components/editable-field";
import {
  PositionableBox,
  SlideLayoutProvider,
} from "@/components/positionable-box";
import { SLIDE_EDIT_ROOT_ATTR } from "@/lib/slide-field-nav";
import type {
  AnomalyFlag,
  CustomThemePalette,
  ParsedData,
  Slide,
} from "@/lib/types";

interface SlideCanvasProps {
  slide: Slide;
  themeId: string;
  data?: ParsedData | null;
  width?: number;
  customPalette?: CustomThemePalette | null;
  logoDataUrl?: string | null;
  rtl?: boolean;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  onSlideChange?: (slide: Slide) => void;
  headingFont?: string | null;
  bodyFont?: string | null;
  deckChartColors?: string[] | null;
}

/**
 * High-fidelity HTML rendering of a single slide. Geometry and colors mirror
 * the pptxgenjs renderer (see lib/layout.ts + lib/pptx) so what you preview is
 * what you export.
 */
export function SlideCanvas({
  slide,
  themeId,
  data,
  width = 960,
  customPalette,
  logoDataUrl,
  rtl,
  anomalyFlags,
  suppressedAnomalyIds,
  onSlideChange,
  headingFont,
  bodyFont,
  deckChartColors,
}: SlideCanvasProps) {
  const theme = getTheme(themeId, customPalette);
  const bodyFontCss = cssFontStack(bodyFont ?? headingFont);
  const headingFontCss = cssFontStack(headingFont ?? bodyFont);
  const height = (width * DECK.heightIn) / DECK.widthIn;
  const px = (pt: number) => ptToPreviewPx(pt, width);

  return (
    <SlideLayoutProvider
      enabled={!!onSlideChange}
      slide={slide}
      previewWidth={width}
      onSlideChange={onSlideChange}
    >
      <div
        {...(onSlideChange ? { [SLIDE_EDIT_ROOT_ATTR]: true } : {})}
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
          background: withHash(theme.background),
          fontFamily: bodyFontCss,
          direction: rtl ? "rtl" : "ltr",
        }}
      >
        <SlideEmbeds
          slide={slide}
          theme={theme}
          data={data}
          anomalyFlags={anomalyFlags}
          suppressedAnomalyIds={suppressedAnomalyIds}
          deckChartColors={deckChartColors}
        />
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <SlideBody
            slide={slide}
            theme={theme}
            data={data}
            px={px}
            anomalyFlags={anomalyFlags}
            suppressedAnomalyIds={suppressedAnomalyIds}
            onChange={onSlideChange}
            headingFontCss={headingFontCss}
            deckChartColors={deckChartColors}
          />
        </div>
        {logoDataUrl && slide.type === "title" && (
          <img
            src={logoDataUrl}
            alt=""
            style={{
              position: "absolute",
              zIndex: 2,
              right: `${(1.8 / DECK.widthIn) * 100}%`,
              top: `${(0.35 / DECK.heightIn) * 100}%`,
              width: `${(1.4 / DECK.widthIn) * 100}%`,
              height: `${(0.7 / DECK.heightIn) * 100}%`,
              objectFit: "contain",
            }}
          />
        )}
      </div>
    </SlideLayoutProvider>
  );
}

function SlideBody({
  slide,
  theme,
  data,
  px,
  anomalyFlags,
  suppressedAnomalyIds,
  onChange,
  headingFontCss,
  deckChartColors,
}: {
  slide: Slide;
  theme: Theme;
  data?: ParsedData | null;
  px: (pt: number) => number;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  onChange?: (slide: Slide) => void;
  headingFontCss?: string;
  deckChartColors?: string[] | null;
}) {
  const subProps = {
    slide,
    theme,
    px,
    onChange,
    headingFontCss,
    deckChartColors,
  };
  switch (slide.type) {
    case "title":
      return <TitleSlide {...subProps} />;
    case "divider":
    case "closing":
      return <DividerSlide {...subProps} />;
    case "kpi":
      return <KpiSlide {...subProps} />;
    case "comparison":
      return <ComparisonSlide {...subProps} />;
    case "quote":
      return <QuoteSlide {...subProps} />;
    case "timeline":
      return <TimelineSlide {...subProps} />;
    case "table":
      return <TableSlide {...subProps} />;
    case "chart":
      return (
        <ChartSlide
          {...subProps}
          data={data}
          anomalyFlags={anomalyFlags}
          suppressedAnomalyIds={suppressedAnomalyIds}
        />
      );
    case "content":
    default:
      if (slide.is_insight) {
        return <InsightSlide {...subProps} />;
      }
      return <ContentSlide {...subProps} />;
  }
}

/* ---- shared bits ---- */

function TitleBand({ slide, theme, px, onChange, headingFontCss }: Sub) {
  const patch = (partial: Partial<Slide>) =>
    onChange?.({ ...slide, ...partial });

  return (
    <>
      <PositionableBox elementId="title" defaultBox={REGIONS.title}>
        <EditableText
          editable={!!onChange}
          fieldLabel="Slide title"
          value={slide.title}
          onChange={(title) => patch({ title })}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: withHash(theme.title),
            fontSize: px(FONT_PT.title),
            fontWeight: 700,
            lineHeight: 1.05,
            fontFamily: headingFontCss ?? undefined,
          }}
        />
      </PositionableBox>
      <div
        style={{
          position: "absolute",
          left: boxToCssPct(REGIONS.title).left,
          top: `${((REGIONS.title.y + REGIONS.title.h + 0.02) / DECK.heightIn) * 100}%`,
          width: `${(1.4 / DECK.widthIn) * 100}%`,
          height: `${(0.06 / DECK.heightIn) * 100}%`,
          background: withHash(theme.palette.primary),
        }}
      />
    </>
  );
}

function Footer({ slide, theme, px }: Sub) {
  return (
    <div
      style={{
        position: "absolute",
        right: "3%",
        bottom: "3%",
        color: withHash(theme.muted),
        fontSize: px(FONT_PT.footer),
      }}
    >
      {slide.index}
    </div>
  );
}

type Sub = {
  slide: Slide;
  theme: Theme;
  px: (pt: number) => number;
  onChange?: (slide: Slide) => void;
  headingFontCss?: string;
  deckChartColors?: string[] | null;
};

function Bullets({
  items,
  theme,
  px,
  size = FONT_PT.body,
  editable,
  onItemsChange,
  fieldLabelPrefix,
}: {
  items: string[];
  theme: Theme;
  px: (pt: number) => number;
  size?: number;
  editable?: boolean;
  onItemsChange?: (items: string[]) => void;
  fieldLabelPrefix?: string;
}) {
  return (
    <EditableBullets
      items={items}
      onChange={onItemsChange ?? (() => {})}
      theme={{ body: withHash(theme.body) }}
      px={px}
      size={size}
      editable={editable && !!onItemsChange}
      fieldLabelPrefix={fieldLabelPrefix}
    />
  );
}

/* ---- slide types ---- */

function TitleSlide({ slide, theme, px, onChange }: Sub) {
  const patch = (partial: Partial<Slide>) => onChange?.({ ...slide, ...partial });
  const editable = !!onChange;

  return (
    <>
      <PositionableBox elementId="heroTitle" defaultBox={REGIONS.heroTitle}>
        <EditableText
          editable={editable}
          fieldLabel="Title slide heading"
          value={slide.title}
          onChange={(title) => patch({ title })}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "flex-end",
            color: withHash(theme.title),
            fontSize: px(FONT_PT.heroTitle),
            fontWeight: 800,
            lineHeight: 1.02,
          }}
        />
      </PositionableBox>
      {(slide.subtitle || editable) && (
        <PositionableBox elementId="heroSubtitle" defaultBox={REGIONS.heroSubtitle}>
          <EditableText
            editable={editable}
            fieldLabel="Title slide subtitle"
            value={slide.subtitle ?? ""}
            onChange={(subtitle) => patch({ subtitle })}
            style={{
              width: "100%",
              height: "100%",
              color: withHash(theme.body),
              fontSize: px(FONT_PT.heroSubtitle),
            }}
          />
        </PositionableBox>
      )}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: "100%",
          height: `${(0.25 / DECK.heightIn) * 100}%`,
          background: withHash(theme.palette.primary),
        }}
      />
    </>
  );
}

function DividerSlide({ slide, theme, px, onChange }: Sub) {
  const patch = (partial: Partial<Slide>) => onChange?.({ ...slide, ...partial });
  const editable = !!onChange;
  const subText = slide.subtitle ?? slide.body.join("  •  ");

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: withHash(theme.dividerBg),
        }}
      />
      <PositionableBox elementId="dividerTitle" defaultBox={DIVIDER_TITLE_BOX}>
        <EditableText
          editable={editable}
          fieldLabel="Divider title"
          value={slide.title}
          onChange={(title) => patch({ title })}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: withHash(theme.dividerText),
            fontSize: px(FONT_PT.heroTitle),
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        />
      </PositionableBox>
      {(subText || editable) && (
        <PositionableBox
          elementId="dividerSubtitle"
          defaultBox={{ ...REGIONS.heroSubtitle, y: 4.3 }}
        >
          <EditableText
            editable={editable}
            fieldLabel="Divider subtitle"
            value={subText}
            onChange={(text) =>
              patch(
                slide.subtitle
                  ? { subtitle: text }
                  : { body: text.split(/\s*•\s*/).filter(Boolean) }
              )
            }
            style={{
              width: "100%",
              height: "100%",
              color: withHash(theme.dividerText),
              fontSize: px(FONT_PT.heroSubtitle),
              opacity: 0.9,
            }}
          />
        </PositionableBox>
      )}
    </>
  );
}

function InsightSlide({
  slide,
  theme,
  px,
  onChange,
}: Sub) {
  const text = slide.body[0] ?? slide.title;
  const patch = (partial: Partial<Slide>) => onChange?.({ ...slide, ...partial });

  return (
    <>
      <PositionableBox elementId="insight" defaultBox={INSIGHT_BOX}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: withHash(theme.surface),
            padding: `${px(12)}px`,
            boxSizing: "border-box",
          }}
        >
          <EditableText
            editable={!!onChange}
            fieldLabel="Insight text"
            value={text}
            onChange={(t) => patch({ body: [t], title: slide.title })}
            style={{
              fontSize: px(FONT_PT.quote),
              fontWeight: 600,
              color: withHash(theme.title),
              textAlign: "center",
              lineHeight: 1.35,
              width: "100%",
            }}
          />
          <div
            style={{
              marginTop: px(16),
              fontSize: px(FONT_PT.kpiLabel),
              color: withHash(theme.muted),
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Insight
          </div>
        </div>
      </PositionableBox>
    </>
  );
}

function ContentSlide({ slide, theme, px, onChange }: Sub) {
  const twoCol = slide.layout_hint === "two_col" && !slide.chart;
  const bodyRegion = slide.chart ? REGIONS.bodyText : REGIONS.body;
  const mid = Math.ceil(slide.body.length / 2);
  const patch = (partial: Partial<Slide>) => onChange?.({ ...slide, ...partial });
  const editable = !!onChange;

  return (
    <>
      <TitleBand slide={slide} theme={theme} px={px} onChange={onChange} />
      {twoCol ? (
        <>
          <PositionableBox elementId="colLeft" defaultBox={REGIONS.colLeft}>
            <Bullets
              items={slide.body.slice(0, mid)}
              theme={theme}
              px={px}
              editable={editable}
              onItemsChange={(left) => {
                const right = slide.body.slice(mid);
                patch({ body: [...left, ...right] });
              }}
            />
          </PositionableBox>
          <PositionableBox elementId="colRight" defaultBox={REGIONS.colRight}>
            <Bullets
              items={slide.body.slice(mid)}
              theme={theme}
              px={px}
              editable={editable}
              onItemsChange={(right) => {
                const left = slide.body.slice(0, mid);
                patch({ body: [...left, ...right] });
              }}
            />
          </PositionableBox>
        </>
      ) : (
        <PositionableBox elementId="body" defaultBox={bodyRegion}>
          <Bullets
            items={slide.body}
            theme={theme}
            px={px}
            editable={editable}
            onItemsChange={(body) => patch({ body })}
          />
        </PositionableBox>
      )}
      <Footer slide={slide} theme={theme} px={px} />
    </>
  );
}

function KpiSlide({ slide, theme, px, onChange }: Sub) {
  const kpis = (slide.kpis ?? []).slice(0, 4);
  const editable = !!onChange;
  const patchKpi = (index: number, field: "value" | "label" | "delta", val: string) => {
    if (!onChange) return;
    const next = (slide.kpis ?? []).map((k, i) =>
      i === index ? { ...k, [field]: val } : k
    );
    onChange({ ...slide, kpis: next });
  };

  return (
    <>
      <TitleBand slide={slide} theme={theme} px={px} onChange={onChange} />
      <PositionableBox elementId="body" defaultBox={REGIONS.body}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            gap: "2%",
            alignItems: "stretch",
            paddingTop: px(10),
            boxSizing: "border-box",
          }}
        >
          {kpis.map((kpi, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: withHash(theme.surface),
              border: `1px solid ${withHash(theme.palette.primary)}`,
              borderRadius: px(8),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: px(10),
              textAlign: "center",
            }}
          >
            <EditableText
              editable={editable}
              fieldLabel={`KPI ${i + 1} value`}
              value={kpi.value}
              onChange={(v) => patchKpi(i, "value", v)}
              style={{
                color: withHash(theme.palette.primary),
                fontSize: px(FONT_PT.kpiValue),
                fontWeight: 800,
                lineHeight: 1,
              }}
            />
            <EditableText
              editable={editable}
              fieldLabel={`KPI ${i + 1} label`}
              value={kpi.label}
              onChange={(v) => patchKpi(i, "label", v)}
              style={{
                color: withHash(theme.title),
                fontSize: px(FONT_PT.kpiLabel),
                fontWeight: 700,
                marginTop: px(8),
              }}
            />
            {(kpi.delta || editable) && (
              <EditableText
                editable={editable}
                fieldLabel={`KPI ${i + 1} change`}
                value={kpi.delta ?? ""}
                onChange={(v) => patchKpi(i, "delta", v)}
                style={{
                  color: withHash(theme.muted),
                  fontSize: px(12),
                  marginTop: px(4),
                }}
              />
            )}
          </div>
        ))}
        </div>
      </PositionableBox>
      <Footer slide={slide} theme={theme} px={px} />
    </>
  );
}

function ComparisonSlide({ slide, theme, px, onChange }: Sub) {
  const c = slide.comparison;
  if (!c) return <ContentSlide slide={slide} theme={theme} px={px} onChange={onChange} />;
  const editable = !!onChange;
  const cols = [
    { side: "left" as const, box: REGIONS.colLeft, data: c.left },
    { side: "right" as const, box: REGIONS.colRight, data: c.right },
  ];

  const patchComparison = (
    side: "left" | "right",
    patch: Partial<{ heading: string; points: string[] }>
  ) => {
    if (!onChange || !slide.comparison) return;
    const col = slide.comparison[side];
    onChange({
      ...slide,
      comparison: {
        ...slide.comparison,
        [side]: { ...col, ...patch },
      },
    });
  };

  return (
    <>
      <TitleBand slide={slide} theme={theme} px={px} onChange={onChange} />
      {cols.map(({ side, box, data }, i) => (
        <PositionableBox key={i} elementId={side === "left" ? "colLeft" : "colRight"} defaultBox={box}>
          <EditableText
            editable={editable}
            fieldLabel={`${side === "left" ? "Left" : "Right"} column heading`}
            value={data.heading}
            onChange={(heading) => patchComparison(side, { heading })}
            style={{
              background: withHash(theme.palette.primary),
              color: withHash(theme.background),
              fontWeight: 700,
              fontSize: px(FONT_PT.subtitle),
              padding: `${px(6)}px ${px(10)}px`,
              borderRadius: px(4),
            }}
          />
          <div style={{ marginTop: px(10) }}>
            <Bullets
              items={data.points}
              theme={theme}
              px={px}
              editable={editable}
              fieldLabelPrefix={`${side === "left" ? "Left" : "Right"} bullet`}
              onItemsChange={(points) => patchComparison(side, { points })}
            />
          </div>
        </PositionableBox>
      ))}
      <Footer slide={slide} theme={theme} px={px} />
    </>
  );
}

function QuoteSlide({
  slide,
  theme,
  px,
  onChange,
}: Sub) {
  const q = slide.quote ?? { text: slide.title };
  const editable = !!onChange;
  const patchQuote = (patch: Partial<{ text: string; attribution?: string }>) => {
    onChange?.({
      ...slide,
      quote: { ...q, ...patch },
    });
  };

  return (
    <>
      <PositionableBox elementId="quote" defaultBox={QUOTE_TEXT_BOX}>
        <EditableText
          editable={editable}
          fieldLabel="Quote text"
          value={q.text}
          onChange={(text) => patchQuote({ text })}
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            color: withHash(theme.title),
            fontSize: px(FONT_PT.quote),
            fontStyle: "italic",
            fontWeight: 600,
            lineHeight: 1.25,
          }}
        />
      </PositionableBox>
      {(q.attribution || editable) && (
        <PositionableBox elementId="quoteAttribution" defaultBox={QUOTE_ATTR_BOX}>
          <EditableText
            editable={editable}
            fieldLabel="Quote attribution"
            value={q.attribution ? `— ${q.attribution}` : ""}
            onChange={(raw) =>
              patchQuote({ attribution: raw.replace(/^—\s*/, "") })
            }
            style={{
              width: "100%",
              height: "100%",
              color: withHash(theme.muted),
              fontSize: px(FONT_PT.attribution),
            }}
          />
        </PositionableBox>
      )}
    </>
  );
}

function TimelineSlide({ slide, theme, px, onChange }: Sub) {
  const items = slide.timeline ?? [];
  const editable = !!onChange;
  const patch = (partial: Partial<Slide>) => onChange?.({ ...slide, ...partial });

  const patchItem = (index: number, field: "label" | "title" | "description", value: string) => {
    const next = items.map((item, i) =>
      i === index ? { ...item, [field]: value || undefined } : item
    );
    patch({ timeline: next });
  };

  const addItem = () =>
    patch({
      timeline: [...items, { label: "Step", title: "New milestone", description: "" }],
    });

  return (
    <>
      <TitleBand slide={slide} theme={theme} px={px} onChange={onChange} />
      <PositionableBox elementId="body" defaultBox={REGIONS.body}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            gap: "1%",
          }}
        >
          {items.map((item, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center" }}>
            <EditableText
              editable={editable}
              value={item.label}
              onChange={(label) => patchItem(i, "label", label)}
              style={{
                color: withHash(theme.palette.primary),
                fontWeight: 700,
                fontSize: px(12),
              }}
            />
            <div
              style={{
                height: px(10),
                width: px(10),
                borderRadius: "50%",
                background: withHash(theme.palette.primary),
                margin: `${px(8)}px auto`,
              }}
            />
            <EditableText
              editable={editable}
              value={item.title}
              onChange={(title) => patchItem(i, "title", title)}
              style={{
                color: withHash(theme.title),
                fontWeight: 700,
                fontSize: px(13),
              }}
            />
            {(item.description || editable) && (
              <EditableText
                editable={editable}
                value={item.description ?? ""}
                onChange={(description) => patchItem(i, "description", description)}
                style={{
                  color: withHash(theme.body),
                  fontSize: px(11),
                  marginTop: px(2),
                }}
              />
            )}
          </div>
        ))}
        </div>
      </PositionableBox>
      {editable && (
        <button
          type="button"
          onClick={addItem}
          className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-[10px] text-blue-600 hover:underline"
          style={{ fontSize: px(9) }}
        >
          + timeline step
        </button>
      )}
      <Footer slide={slide} theme={theme} px={px} />
    </>
  );
}

function TableSlide({ slide, theme, px, onChange }: Sub) {
  const t = slide.table;
  const editable = !!onChange;

  if (!t) return <ContentSlide slide={slide} theme={theme} px={px} onChange={onChange} />;

  const patchTable = (columns: string[], rows: string[][]) =>
    onChange?.({ ...slide, table: { ...t, columns, rows } });

  const patchColumn = (index: number, name: string) => {
    const columns = [...t.columns];
    columns[index] = name;
    patchTable(columns, t.rows);
  };

  const patchCell = (rowIndex: number, colIndex: number, value: string) => {
    const rows = t.rows.map((row, ri) =>
      ri === rowIndex
        ? row.map((cell, ci) => (ci === colIndex ? value : cell))
        : row
    );
    patchTable(t.columns, rows);
  };

  const cellStyle = (ri: number): React.CSSProperties => ({
    color: withHash(theme.body),
    padding: `${px(5)}px ${px(8)}px`,
    background: withHash(ri % 2 === 0 ? theme.background : theme.surface),
  });

  const headerStyle: React.CSSProperties = {
    background: withHash(theme.palette.primary),
    color: withHash(theme.background),
    textAlign: "left",
    padding: `${px(6)}px ${px(8)}px`,
    fontSize: px(FONT_PT.tableHeader),
    fontWeight: 700,
  };

  return (
    <>
      <TitleBand slide={slide} theme={theme} px={px} onChange={onChange} />
      <PositionableBox elementId="body" defaultBox={REGIONS.body}>
        <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", fontSize: px(FONT_PT.tableCell) }}>
          <thead>
            <tr>
              {t.columns.map((c, i) => (
                <th key={i} style={headerStyle}>
                  {editable ? (
                    <EditableText
                      editable
                      value={c}
                      onChange={(name) => patchColumn(i, name)}
                      style={{ color: withHash(theme.background), fontWeight: 700 }}
                    />
                  ) : (
                    c
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.rows.slice(0, TABLE_MAIN_ROWS).map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} style={cellStyle(ri)}>
                    {editable ? (
                      <EditableText
                        editable
                        value={String(cell ?? "")}
                        onChange={(value) => patchCell(ri, ci, value)}
                        style={{ color: withHash(theme.body) }}
                      />
                    ) : (
                      String(cell ?? "")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {t.rows.length > TABLE_MAIN_ROWS && (
          <p
            style={{
              marginTop: px(4),
              fontSize: px(10),
              color: withHash(theme.muted),
              fontStyle: "italic",
            }}
          >
            First {TABLE_MAIN_ROWS} rows shown — export adds appendix slides for{" "}
            {t.rows.length - TABLE_MAIN_ROWS} more.
          </p>
        )}
      </PositionableBox>
      <Footer slide={slide} theme={theme} px={px} />
    </>
  );
}

function ChartSlide({
  slide,
  theme,
  data,
  px,
  anomalyFlags,
  suppressedAnomalyIds,
  onChange,
  deckChartColors,
}: Sub & {
  data?: ParsedData | null;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
}) {
  const resolved =
    slide.chart && data ? resolveChartData(slide.chart, data) : null;
  const chartAnomalies =
    slide.chart && anomalyFlags
      ? anomaliesForChart(
          anomalyFlags,
          slide.chart.data_ref,
          slide.chart.y_cols?.[0],
          suppressedAnomalyIds
        )
      : [];

  return (
    <>
      <TitleBand slide={slide} theme={theme} px={px} onChange={onChange} />
      <PositionableBox elementId="chart" defaultBox={REGIONS.chart}>
        {resolved ? (
          <ChartPreview
            type={slide.chart!.type}
            labels={resolved.labels}
            series={resolved.series}
            theme={theme}
            seriesColors={chartColorsForSlide(slide, theme, deckChartColors)}
            anomalies={chartAnomalies}
            stacked={slide.chart!.stacked === true && !slide.chart!.grouped}
          />
        ) : (
          <Bullets
            items={slide.body.length ? slide.body : ["(chart data unavailable)"]}
            theme={theme}
            px={px}
            editable={!!onChange}
            onItemsChange={(body) => onChange?.({ ...slide, body })}
          />
        )}
      </PositionableBox>
      <Footer slide={slide} theme={theme} px={px} />
    </>
  );
}

function ChartPreview({
  type,
  labels,
  series,
  theme,
  seriesColors,
  anomalies = [],
  stacked = false,
}: {
  type: string;
  labels: string[];
  series: { name: string; values: number[] }[];
  theme: Theme;
  seriesColors: string[];
  anomalies?: AnomalyFlag[];
  stacked?: boolean;
}) {
  const colors = seriesColors.map(withHash);
  const rows = labels.map((label, i) => {
    const row: Record<string, string | number> = { name: label };
    series.forEach((s) => (row[s.name] = s.values[i] ?? 0));
    return row;
  });

  const axisProps = {
    tick: { fill: withHash(theme.body), fontSize: 11 },
    stroke: withHash(theme.muted),
  };

  const wrap = (chart: React.ReactNode) => (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {chart}
      <AnomalyCallouts anomalies={anomalies} />
    </div>
  );

  if (type === "pie" || type === "donut") {
    const pieData = labels.map((label, i) => ({
      name: label,
      value: series[0]?.values[i] ?? 0,
    }));
    return wrap(
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            innerRadius={type === "donut" ? "55%" : 0}
            outerRadius="80%"
          >
            {pieData.map((_, i) => (
              <Cell key={i} fill={colors[i % colors.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11, color: withHash(theme.body) }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (type === "scatter") {
    const scatterData = labels.map((label, i) => ({
      x: Number(label) || i,
      y: series[0]?.values[i] ?? 0,
    }));
    return wrap(
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid stroke={withHash(theme.surface)} />
          <XAxis type="number" dataKey="x" {...axisProps} />
          <YAxis type="number" dataKey="y" {...axisProps} />
          <Tooltip />
          <Scatter data={scatterData} fill={colors[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (type === "line" || type === "area") {
    const Chart = type === "area" ? AreaChart : LineChart;
    return wrap(
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={rows}>
          <CartesianGrid stroke={withHash(theme.surface)} />
          <XAxis dataKey="name" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) =>
            type === "area" ? (
              <Area
                key={s.name}
                dataKey={s.name}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
              />
            ) : (
              <Line
                key={s.name}
                dataKey={s.name}
                stroke={colors[i % colors.length]}
                dot={false}
                strokeWidth={2}
              />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    );
  }

  // bar / combo fallback
  return wrap(
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows}>
        <CartesianGrid stroke={withHash(theme.surface)} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={colors[i % colors.length]}
            stackId={stacked ? "sf" : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Image + chart on any slide type (chart slides use ChartSlide for full chart). */
function SlideEmbeds({
  slide,
  theme,
  data,
  anomalyFlags,
  suppressedAnomalyIds,
  deckChartColors,
}: {
  slide: Slide;
  theme: Theme;
  data?: ParsedData | null;
  anomalyFlags?: AnomalyFlag[];
  suppressedAnomalyIds?: string[];
  deckChartColors?: string[] | null;
}) {
  const img = slide.image;
  const showAsideChart =
    slide.chart && data && slide.type !== "chart";

  const chartAnomalies =
    slide.chart && anomalyFlags
      ? anomaliesForChart(
          anomalyFlags,
          slide.chart.data_ref,
          slide.chart.y_cols?.[0],
          suppressedAnomalyIds
        )
      : [];

  const resolved =
    showAsideChart && slide.chart
      ? resolveChartData(slide.chart, data)
      : null;

  return (
    <>
      {img?.dataUrl && (
        <PositionableBox
          elementId="image"
          defaultBox={imageDefaultBox(img.placement)}
          zIndex={img.placement === "hero" ? 0 : 2}
        >
          <img
            src={img.dataUrl}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: img.placement === "hero" ? "cover" : "contain",
              opacity: img.placement === "hero" ? 0.35 : 1,
            }}
          />
        </PositionableBox>
      )}
      {showAsideChart && resolved && slide.chart && (
        <PositionableBox elementId="chartAside" defaultBox={REGIONS.chartAside} zIndex={0}>
          <ChartPreview
            type={slide.chart.type}
            labels={resolved.labels}
            series={resolved.series}
            theme={theme}
            seriesColors={chartColorsForSlide(slide, theme, deckChartColors)}
            anomalies={chartAnomalies}
          />
        </PositionableBox>
      )}
    </>
  );
}

function AnomalyCallouts({ anomalies }: { anomalies: AnomalyFlag[] }) {
  if (!anomalies.length) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 2,
        left: 4,
        right: 4,
        zIndex: 10,
        pointerEvents: "none",
      }}
    >
      {anomalies.slice(0, 2).map((a) => (
        <div
          key={a.id}
          style={{
            background: "rgba(254, 242, 242, 0.95)",
            color: "#b91c1c",
            fontSize: 10,
            padding: "2px 6px",
            marginTop: 2,
            borderRadius: 4,
            border: "1px solid #fecaca",
            lineHeight: 1.3,
          }}
        >
          {a.message}
        </div>
      ))}
    </div>
  );
}
