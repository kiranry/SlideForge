import "server-only";
import JSZip from "jszip";

export interface ExtractedSlideStructure {
  index: number;
  inferredType: string;
  title: string;
  bodyPreview: string[];
  hasChart: boolean;
}

export interface DeckStructure {
  fileName: string;
  slideCount: number;
  slides: ExtractedSlideStructure[];
}

function extractTextFromSlideXml(xml: string): string[] {
  const texts: string[] = [];
  const re = /<a:t[^>]*>([^<]*)<\/a:t>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const t = m[1].trim();
    if (t) texts.push(t);
  }
  return texts;
}

function inferType(
  index: number,
  total: number,
  texts: string[],
  hasChart: boolean
): string {
  if (index === 0) return "title";
  if (index === total - 1) return "closing";
  if (hasChart) return "chart";
  if (texts.length <= 2 && texts.join(" ").length < 40) return "divider";
  if (texts.length === 1 && texts[0].length > 60) return "quote";
  return "content";
}

/** Extract slide structure from an uploaded .pptx (competitor / template deck). */
export async function parsePptxStructure(
  buffer: Buffer,
  fileName: string
): Promise<DeckStructure> {
  const zip = await JSZip.loadAsync(buffer);
  const slideFiles = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/i.test(p))
    .sort((a, b) => {
      const na = parseInt(a.match(/slide(\d+)/i)?.[1] ?? "0", 10);
      const nb = parseInt(b.match(/slide(\d+)/i)?.[1] ?? "0", 10);
      return na - nb;
    });

  const slides: ExtractedSlideStructure[] = [];

  for (let i = 0; i < slideFiles.length; i++) {
    const path = slideFiles[i];
    const xml = await zip.file(path)!.async("string");
    const texts = extractTextFromSlideXml(xml);

    const relPath = path.replace("slides/", "slides/_rels/") + ".rels";
    const relFile = zip.file(relPath);
    let hasChart = false;
    if (relFile) {
      const relXml = await relFile.async("string");
      hasChart = /charts\/chart/i.test(relXml);
    }

    const title = texts[0] ?? `Slide ${i + 1}`;
    const bodyPreview = texts.slice(1, 6);

    slides.push({
      index: i + 1,
      inferredType: inferType(i, slideFiles.length, texts, hasChart),
      title,
      bodyPreview,
      hasChart,
    });
  }

  return {
    fileName,
    slideCount: slides.length,
    slides,
  };
}
