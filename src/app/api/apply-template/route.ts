import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyTemplateToData } from "@/lib/apply-template";
import { parsedDataSchema } from "@/lib/schema";
import { savedDeckTemplateSchema } from "@/lib/templates/saved-template-schema";

export const runtime = "nodejs";

const requestSchema = z.object({
  template: savedDeckTemplateSchema,
  data: parsedDataSchema,
  columnMappings: z.record(z.string(), z.string()).optional(),
  sheetMappings: z.record(z.string(), z.string()).optional(),
});

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
    const result = applyTemplateToData({
      template: input.template,
      data: input.data,
      columnMappings: input.columnMappings,
      sheetMappings: input.sheetMappings,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Apply template failed." },
      { status: 500 }
    );
  }
}
