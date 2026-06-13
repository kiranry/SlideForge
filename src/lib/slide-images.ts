export interface ImagePromptContext {
  title: string;
  body?: string[];
  preset?: "hero" | "illustration" | "photo";
}

export function buildImagePrompt(
  userPrompt: string,
  ctx: ImagePromptContext
): string {
  const base = userPrompt.trim();
  const contextLine = ctx.body?.length
    ? `Presentation context — title: "${ctx.title}". Bullets: ${ctx.body.slice(0, 3).join("; ")}.`
    : `Presentation context — slide title: "${ctx.title}".`;

  if (ctx.preset === "hero") {
    return [
      contextLine,
      `Create an abstract professional hero background for this slide: ${base || "soft gradients, modern corporate, no text, no logos"}.`,
      "Wide 16:9 composition suitable as a presentation slide background.",
    ].join(" ");
  }
  if (ctx.preset === "illustration") {
    return [
      contextLine,
      `Flat icon-style illustration: ${base || "clean minimal business concept related to the slide topic"}.`,
      "Simple shapes, no text, white or transparent-friendly background.",
    ].join(" ");
  }
  if (ctx.preset === "photo") {
    return [
      contextLine,
      `Photorealistic image: ${base || "professional stock photo matching the slide topic"}.`,
      "Natural lighting, no text overlays, no watermarks.",
    ].join(" ");
  }

  return [contextLine, base].filter(Boolean).join(" ");
}

export const IMAGE_PRESETS: {
  id: NonNullable<ImagePromptContext["preset"]>;
  label: string;
  hint: string;
  aspectRatio: "16:9" | "1:1" | "4:3";
  defaultPlacement: "hero" | "right" | "inline";
}[] = [
  {
    id: "hero",
    label: "Abstract hero",
    hint: "Full-slide background",
    aspectRatio: "16:9",
    defaultPlacement: "hero",
  },
  {
    id: "illustration",
    label: "Icon illustration",
    hint: "Minimal flat style",
    aspectRatio: "1:1",
    defaultPlacement: "right",
  },
  {
    id: "photo",
    label: "Photo realistic",
    hint: "Stock-style photo",
    aspectRatio: "4:3",
    defaultPlacement: "right",
  },
];
