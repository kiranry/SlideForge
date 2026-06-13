import "server-only";

import fs from "fs/promises";
import path from "path";
import type { ShareRecord } from "@/lib/share-types";

const SHARE_DIR = path.join(process.cwd(), "data", "shares");

async function ensureDir(): Promise<void> {
  await fs.mkdir(SHARE_DIR, { recursive: true });
}

function sharePath(token: string): string {
  const safe = token.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(SHARE_DIR, `${safe}.json`);
}

export async function saveShare(record: ShareRecord): Promise<void> {
  await ensureDir();
  await fs.writeFile(sharePath(record.token), JSON.stringify(record), "utf8");
}

export async function getShare(token: string): Promise<ShareRecord | null> {
  try {
    const raw = await fs.readFile(sharePath(token), "utf8");
    return JSON.parse(raw) as ShareRecord;
  } catch {
    return null;
  }
}

export async function revokeShare(token: string): Promise<boolean> {
  const record = await getShare(token);
  if (!record) return false;
  record.revoked = true;
  await saveShare(record);
  return true;
}

export function isShareActive(record: ShareRecord): boolean {
  if (record.revoked) return false;
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false;
  return true;
}

export async function addShareComment(
  token: string,
  comment: ShareRecord["comments"][number]
): Promise<ShareRecord | null> {
  const record = await getShare(token);
  if (!record || !isShareActive(record)) return null;
  record.comments.push(comment);
  await saveShare(record);
  return record;
}

export async function resolveShareComment(
  token: string,
  commentId: string,
  resolved: boolean
): Promise<ShareRecord | null> {
  const record = await getShare(token);
  if (!record) return null;
  const comment = record.comments.find((c) => c.id === commentId);
  if (!comment) return null;
  comment.resolved = resolved;
  await saveShare(record);
  return record;
}
