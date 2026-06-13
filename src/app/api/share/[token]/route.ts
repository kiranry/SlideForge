import { NextRequest, NextResponse } from "next/server";
import {
  getShare,
  isShareActive,
  revokeShare,
} from "@/lib/share-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const record = await getShare(params.token);
  if (!record || !isShareActive(record)) {
    return NextResponse.json(
      { error: "Share link not found or expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    share: {
      token: record.token,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      allowDownload: record.allowDownload,
      deckTitle: record.deckTitle,
      revoked: record.revoked,
      snapshot: record.snapshot,
      comments: record.comments,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  const ok = await revokeShare(params.token);
  if (!ok) {
    return NextResponse.json({ error: "Share not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
