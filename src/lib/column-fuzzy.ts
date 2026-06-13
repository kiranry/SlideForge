/** Fuzzy column and sheet name matching for Weekly Report templates. */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

/** Best match for a column name among candidates, or null if none close enough. */
export function fuzzyMatchName(
  target: string,
  candidates: string[]
): string | null {
  if (!target || candidates.length === 0) return null;

  const lower = target.toLowerCase();
  const exact = candidates.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;

  const normTarget = normalize(target);
  const normMatch = candidates.find((c) => normalize(c) === normTarget);
  if (normMatch) return normMatch;

  const contains = candidates.find(
    (c) =>
      c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())
  );
  if (contains) return contains;

  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = levenshtein(normTarget, normalize(c));
    const threshold = Math.max(2, Math.floor(normTarget.length / 4));
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  return best;
}

export function fuzzyMatchColumn(
  target: string,
  candidates: string[]
): string | null {
  return fuzzyMatchName(target, candidates);
}

export function fuzzyMatchSheet(
  target: string,
  sheetNames: string[]
): string | null {
  return fuzzyMatchName(target, sheetNames);
}
