import "server-only";

import JSZip from "jszip";
import { buildPptx, type PptxBuildOptions } from "@/lib/pptx";
import { buildPresenterDocx } from "@/lib/presenter-docx";
import { parsedDataToCsvFiles } from "@/lib/export/csv";
import { presenterSectionsFromManifest } from "@/lib/presenter-sections";
import type { SlideManifest, ParsedData } from "@/lib/types";

export interface BundleBuildInput {
  manifest: SlideManifest;
  data?: ParsedData | null;
  pptxOptions?: PptxBuildOptions;
}

function safeBaseName(title: string): string {
  return (
    title
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "slideforge-deck"
  );
}

/** Zip: pptx + presenter-script.docx + source-data.csv */
export async function buildExportBundle(input: BundleBuildInput): Promise<{
  buffer: Buffer;
  baseName: string;
}> {
  const baseName = safeBaseName(input.manifest.title);
  const zip = new JSZip();

  const pptx = await buildPptx(
    input.manifest,
    input.data ?? null,
    input.pptxOptions
  );
  zip.file(`${baseName}.pptx`, pptx);

  const sections = presenterSectionsFromManifest(input.manifest);
  const docx = await buildPresenterDocx(input.manifest.title, sections);
  zip.file("presenter-script.docx", docx);

  if (input.data?.sheets?.length) {
    const csvFiles = parsedDataToCsvFiles(input.data);
    for (const [name, content] of Object.entries(csvFiles)) {
      zip.file(name, content);
    }
  }

  const buffer = (await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
  })) as Buffer;

  return { buffer, baseName };
}
