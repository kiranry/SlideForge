import { NextResponse } from "next/server";
import { getImageProviderStatus } from "@/lib/ai/image-providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getImageProviderStatus());
}
