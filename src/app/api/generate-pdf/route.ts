import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildPdfHandout } from "@/lib/export/pdf";
import { slideManifestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const paletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
});

const requestSchema = z.object({
  manifest: slideManifestSchema,
  customTheme: paletteSchema.nullable().optional(),
  includeNotes: z.boolean().optional(),
  layout: z.enum(["stacked", "grid"]).optional(),
});

function safeFileName(title: string): string {
  const base = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "slideforge-deck"}.pdf`;
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
    const buffer = await buildPdfHandout(input.manifest, {
      includeNotes: input.includeNotes,
      layout: input.layout,
      customTheme: input.customTheme,
    });
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFileName(input.manifest.title)}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to build PDF." },
      { status: 500 }
    );
  }
}
