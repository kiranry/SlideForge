import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getShare, isShareActive } from "@/lib/share-store";

export const runtime = "nodejs";

const requestSchema = z.object({
  tokens: z.array(z.string()).max(20),
});

/** Owner polls comment activity across their share tokens. */
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

  const shares = [];
  for (const token of input.tokens) {
    const record = await getShare(token);
    if (!record) continue;
    shares.push({
      token: record.token,
      deckTitle: record.deckTitle,
      active: isShareActive(record),
      allowDownload: record.allowDownload,
      expiresAt: record.expiresAt,
      comments: record.comments,
    });
  }

  return NextResponse.json({ shares });
}
