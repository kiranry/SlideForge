import { NextRequest, NextResponse } from "next/server";
import { parsePptxStructure } from "@/lib/pptx-parse";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pptx")) {
    return NextResponse.json(
      { error: "Only .pptx files are supported." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File exceeds 15 MB limit." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const structure = await parsePptxStructure(buffer, file.name);
  if (structure.slideCount === 0) {
      return NextResponse.json(
        { error: "No slides found in this presentation." },
        { status: 400 }
      );
    }
    return NextResponse.json({ structure });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Failed to parse .pptx" },
      { status: 500 }
    );
  }
}
