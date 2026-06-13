/** Resize and compress an image file for localStorage-friendly data URLs. */
export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<string> {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const scale = Math.min(1, maxWidth / img.width);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image."));
    img.src = src;
  });
}
