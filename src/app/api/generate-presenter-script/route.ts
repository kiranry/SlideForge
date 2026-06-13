import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateText, stripJsonFences } from "@/lib/ai";
import {
  PRESENTER_SCRIPT_SYSTEM_PROMPT,
  buildPresenterScriptUserPrompt,
} from "@/lib/prompts";
import { extractJson } from "@/lib/manifest";
import { slideManifestSchema } from "@/lib/schema";
import { buildPresenterDocx } from "@/lib/presenter-docx";

export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  manifest: slideManifestSchema,
});

function safeFileName(title: string): string {
  const base = title
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "slideforge"}-script.docx`;
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

  const slides = input.manifest.slides.map((s) => ({
    index: s.index,
    title: s.title,
    speaker_notes: s.speaker_notes,
    body: s.body,
  }));

  try {
    const raw = await generateText({
      system: PRESENTER_SCRIPT_SYSTEM_PROMPT,
      user: buildPresenterScriptUserPrompt(slides),
      maxTokens: 4000,
      temperature: 0.6,
      json: true,
    });

    let sections: { slide_number: number; title: string; script: string }[] = [];
    try {
      const parsed = JSON.parse(extractJson(stripJsonFences(raw)));
      if (Array.isArray(parsed.sections)) {
        sections = parsed.sections;
      }
    } catch {
      // Fallback: use raw speaker notes
      sections = slides.map((s) => ({
        slide_number: s.index,
        title: s.title,
        script: s.speaker_notes || s.body.join(". "),
      }));
    }

    if (sections.length === 0) {
      sections = slides.map((s) => ({
        slide_number: s.index,
        title: s.title,
        script: s.speaker_notes || s.body.join(". "),
      }));
    }

    const buffer = await buildPresenterDocx(input.manifest.title, sections);
    const body = new Uint8Array(buffer);
    const filename = safeFileName(input.manifest.title);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Presenter script generation failed." },
      { status: 500 }
    );
  }
}
