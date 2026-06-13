/** Lightweight client timing — enable with NEXT_PUBLIC_TELEMETRY=1 */

const ENABLED =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_TELEMETRY === "1";

export function trackTiming(label: string, durationMs: number): void {
  if (!ENABLED || typeof window === "undefined") return;
  console.info(`[slideforge] ${label}: ${durationMs.toFixed(0)}ms`);
  try {
    const key = "slideforge:timings";
    const prev = JSON.parse(localStorage.getItem(key) ?? "[]") as Array<{
      label: string;
      ms: number;
      at: string;
    }>;
    prev.unshift({
      label,
      ms: Math.round(durationMs),
      at: new Date().toISOString(),
    });
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
  } catch {
    /* non-fatal */
  }
}

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    trackTiming(label, performance.now() - start);
  }
}
