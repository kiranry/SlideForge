/** Detect SVG data URLs (pptxgenjs cannot embed these). */
export function isSvgDataUrl(dataUrl: string): boolean {
  return /^data:image\/svg/i.test(dataUrl.trim());
}

const DEFAULT_WIDTH = 400;

/**
 * Rasterize an SVG data URL to PNG in the browser for pptx export.
 * No-op for non-SVG inputs.
 */
export async function rasterizeSvgToPng(
  dataUrl: string,
  width = DEFAULT_WIDTH
): Promise<string> {
  if (!isSvgDataUrl(dataUrl)) return dataUrl;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const naturalW = img.naturalWidth || width;
      const naturalH = img.naturalHeight || width * 0.5;
      const scale = width / naturalW;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.max(1, Math.round(naturalH * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load SVG logo"));
    img.src = dataUrl;
  });
}

/** Ensure logo is PNG/JPEG before sending to the pptx builder. */
export async function ensureRasterLogo(
  dataUrl: string | null | undefined
): Promise<string | null | undefined> {
  if (!dataUrl) return dataUrl;
  if (!isSvgDataUrl(dataUrl)) return dataUrl;
  return rasterizeSvgToPng(dataUrl);
}
