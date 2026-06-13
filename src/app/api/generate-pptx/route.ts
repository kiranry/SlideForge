import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildPptx } from "@/lib/pptx";
import {
  slideManifestSchema,
  parsedDataSchema,
  anomalyFlagSchema,
} from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const paletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
});

const requestSchema = z.object({
  manifest: slideManifestSchema,
  data: parsedDataSchema.nullable().optional(),
  customTheme: paletteSchema.nullable().optional(),
  logoDataUrl: z.string().nullable().optional(),
  logoOnAllSlides: z.boolean().optional(),
  anomalyFlags: z.array(anomalyFlagSchema).optional(),
  suppressedAnomalyIds: z.array(z.string()).optional(),
  headingFont: z.string().nullable().optional(),
  bodyFont: z.string().nullable().optional(),
  chartColors: z.array(z.string()).optional(),
});

function safeFileName(title: string): string {
  const base = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "slideforge-deck"}.pptx`;
}

export async function POST(req: NextRequest) {
  let input: z.infer<typeof requestSchema>;
  try {
    input = requestSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid request: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  try {
    const buffer = await buildPptx(input.manifest, input.data ?? null, {
      customTheme: input.customTheme,
      logoDataUrl: input.logoDataUrl,
      logoOnAllSlides: input.logoOnAllSlides,
      anomalyFlags: input.anomalyFlags,
      suppressedAnomalyIds: input.suppressedAnomalyIds,
      headingFont: input.headingFont,
      bodyFont: input.bodyFont,
      chartColors: input.chartColors,
    });
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${safeFileName(input.manifest.title)}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to build .pptx" },
      { status: 500 }
    );
  }
}
