import type { Slide, TableData } from "@/lib/types";

export const TABLE_MAIN_ROWS = 8;
export const TABLE_APPENDIX_ROWS = 15;

export function tableNeedsAppendix(table: TableData): boolean {
  return table.rows.length > TABLE_MAIN_ROWS || table.truncated === true;
}

/** Extra table slides appended after export when the main slide shows only 8 rows. */
export function createTableAppendixSlides(
  parentSlide: Slide,
  table: TableData
): Slide[] {
  const overflow = table.rows.slice(TABLE_MAIN_ROWS);
  if (overflow.length === 0) return [];

  const slides: Slide[] = [];
  for (let i = 0; i < overflow.length; i += TABLE_APPENDIX_ROWS) {
    const chunk = overflow.slice(i, i + TABLE_APPENDIX_ROWS);
    const part = Math.floor(i / TABLE_APPENDIX_ROWS) + 1;
    const totalParts = Math.ceil(overflow.length / TABLE_APPENDIX_ROWS);
    slides.push({
      index: 0,
      type: "table",
      title:
        totalParts > 1
          ? `${parentSlide.title} (appendix ${part}/${totalParts})`
          : `${parentSlide.title} (appendix)`,
      body: [],
      speaker_notes: `Continued table data from slide ${parentSlide.index}.`,
      layout_hint: "standard",
      chart: null,
      table: {
        columns: [...table.columns],
        rows: chunk,
      },
    });
  }
  return slides;
}

/** Expand manifest slides with appendix table slides for export. */
export function expandSlidesForExport(slides: Slide[]): Slide[] {
  const expanded: Slide[] = [];
  for (const slide of slides) {
    expanded.push(slide);
    if (slide.type === "table" && slide.table && tableNeedsAppendix(slide.table)) {
      expanded.push(...createTableAppendixSlides(slide, slide.table));
    }
  }
  return expanded.map((s, i) => ({ ...s, index: i + 1 }));
}
