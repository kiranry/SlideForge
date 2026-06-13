import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  addShareComment,
  getShare,
  isShareActive,
  resolveShareComment,
} from "@/lib/share-store";

export const runtime = "nodejs";

const postSchema = z.object({
  slideIndex: z.number().int().nonnegative(),
  text: z.string().min(1).max(2000),
  author: z.string().max(80).optional(),
});

const patchSchema = z.object({
  commentId: z.string(),
  resolved: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  let input: z.infer<typeof postSchema>;
  try {
    input = postSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid request: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  const record = await addShareComment(params.token, {
    id: randomUUID(),
    slideIndex: input.slideIndex,
    text: input.text.trim(),
    author: input.author?.trim() || "Viewer",
    createdAt: new Date().toISOString(),
    resolved: false,
  });

  if (!record) {
    return NextResponse.json(
      { error: "Share link not found or expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({ comments: record.comments });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: `Invalid request: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  const record = await resolveShareComment(
    params.token,
    input.commentId,
    input.resolved
  );
  if (!record) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  return NextResponse.json({ comments: record.comments });
}

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
  return NextResponse.json({ comments: record.comments });
}
