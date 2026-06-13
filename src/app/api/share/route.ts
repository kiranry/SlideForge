import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { saveShare } from "@/lib/share-store";
import type { ShareRecord } from "@/lib/share-types";
import {
  anomalyFlagSchema,
  parsedDataSchema,
  slideManifestSchema,
} from "@/lib/schema";

export const runtime = "nodejs";

const paletteSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  accent: z.string(),
});

const snapshotSchema = z.object({
  manifest: slideManifestSchema,
  data: parsedDataSchema.nullable().optional(),
  customTheme: paletteSchema.nullable().optional(),
  logoDataUrl: z.string().nullable().optional(),
  logoOnAllSlides: z.boolean().optional(),
  anomalyFlags: z.array(anomalyFlagSchema).optional(),
  suppressedAnomalyIds: z.array(z.string()).optional(),
});

const requestSchema = z.object({
  ownerDeckId: z.string(),
  deckTitle: z.string(),
  snapshot: snapshotSchema,
  allowDownload: z.boolean().default(true),
  expiresInDays: z.number().int().min(1).max(90).nullable().optional(),
});

function shareUrl(req: NextRequest, token: string): string {
  const origin = req.headers.get("origin") ?? req.headers.get("x-forwarded-host");
  if (origin) {
    const base = origin.startsWith("http") ? origin : `https://${origin}`;
    return `${base}/share/${token}`;
  }
  return `/share/${token}`;
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

  const token = randomBytes(18).toString("base64url");
  const expiresAt =
    input.expiresInDays != null
      ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
      : null;

  const record: ShareRecord = {
    token,
    createdAt: new Date().toISOString(),
    expiresAt,
    allowDownload: input.allowDownload,
    deckTitle: input.deckTitle,
    ownerDeckId: input.ownerDeckId,
    revoked: false,
    snapshot: input.snapshot,
    comments: [],
  };

  try {
    await saveShare(record);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message ?? "Could not create share." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    token,
    url: shareUrl(req, token),
    expiresAt,
    allowDownload: record.allowDownload,
  });
}
