"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PREVIEW_WARMUP_ID = "00000000-0000-4000-8000-000000000000";

/** In dev, pre-compile heavy routes so the first user action is not blocked. */
export function DevWarmup() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    router.prefetch("/history");
    router.prefetch("/templates");
    router.prefetch("/brand-kits");
    router.prefetch(`/preview/${PREVIEW_WARMUP_ID}`);
    router.prefetch(`/export/${PREVIEW_WARMUP_ID}`);

    void Promise.allSettled([
      fetch("/api/generate-image/status"),
      fetch("/api/generate-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      fetch("/api/generate-synthetic-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      fetch("/api/generate-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    ]);
  }, [router]);

  return null;
}
