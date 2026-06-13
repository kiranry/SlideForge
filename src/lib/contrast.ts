/** WCAG contrast helpers for custom theme validation. */

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.replace(/^#/, "").trim();
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(hex1: string, hex2: string): number | null {
  const a = parseHex(hex1);
  const b = parseHex(hex2);
  if (!a || !b) return null;
  const l1 = luminance(a.r, a.g, a.b);
  const l2 = luminance(b.r, b.g, b.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** WCAG AA: 4.5 for normal text, 3.0 for large text (18pt+). */
export function meetsWcagAa(
  foreground: string,
  background: string,
  largeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return false;
  return ratio >= (largeText ? 3 : 4.5);
}

export function validateCustomPalette(
  primary: string,
  secondary: string,
  accent: string
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const colors = [
    { name: "primary", hex: primary },
    { name: "secondary", hex: secondary },
    { name: "accent", hex: accent },
  ];
  for (const { name, hex } of colors) {
    if (!parseHex(hex)) errors.push(`${name} is not a valid 6-digit hex color.`);
  }
  if (errors.length) return { ok: false, errors };

  // Title (primary on white) and body (primary on secondary) must meet AA.
  if (!meetsWcagAa(primary, "FFFFFF", true)) {
    errors.push("Primary on white background fails WCAG AA for titles.");
  }
  if (!meetsWcagAa(primary, secondary)) {
    errors.push("Primary on secondary background fails WCAG AA for body text.");
  }
  return { ok: errors.length === 0, errors };
}
