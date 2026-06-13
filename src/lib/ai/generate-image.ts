import "server-only";
import { GoogleGenAI, Modality } from "@google/genai";
import { env } from "@/lib/env";
import {
  markGoogleImageQuotaBlocked,
  isGoogleImageQuotaBlocked,
} from "@/lib/ai/image-providers";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.googleApiKey });
  }
  return client;
}

export interface GenerateImageOptions {
  prompt: string;
  /** 16:9 for slides; 1:1 for inline icons. */
  aspectRatio?: "16:9" | "1:1" | "4:3";
}

export interface GenerateImageResult {
  dataUrl: string;
  provider: "gemini" | "pollinations" | "huggingface";
}

const ASPECT_PX: Record<
  NonNullable<GenerateImageOptions["aspectRatio"]>,
  { width: number; height: number }
> = {
  "16:9": { width: 1280, height: 720 },
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1024, height: 768 },
};

function isImagenModel(model: string): boolean {
  return model.toLowerCase().startsWith("imagen");
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

/** Free Google keys often have limit: 0 for all image models. */
export function isImageQuotaError(err: unknown): boolean {
  const msg = errorMessage(err);
  return /429|quota|RESOURCE_EXHAUSTED|rate.?limit|free_tier|limit:\s*0/i.test(msg);
}

/** Gemini native image models (generateContent + IMAGE modality). */
async function generateViaGeminiImage({
  prompt,
  aspectRatio = "16:9",
  model,
}: GenerateImageOptions & { model: string }): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
      imageConfig: { aspectRatio },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = part.inlineData;
    if (inline?.data) {
      const mime = inline.mimeType ?? "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }

  const block = response.promptFeedback?.blockReason;
  if (block) {
    throw new Error(`Image was blocked: ${block}`);
  }

  throw new Error("Gemini returned no image.");
}

/** Imagen models (paid/billing — not available on free AI Studio keys). */
async function generateViaImagen({
  prompt,
  aspectRatio = "16:9",
  model,
}: GenerateImageOptions & { model: string }): Promise<string> {
  const ai = getClient();
  const response = await ai.models.generateImages({
    model,
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
      outputMimeType: "image/png",
    },
  });

  const generated = response.generatedImages?.[0];
  if (generated?.raiFilteredReason) {
    throw new Error(
      `Image was blocked by content policy: ${generated.raiFilteredReason}`
    );
  }

  const bytes = generated?.image?.imageBytes;
  if (!bytes) {
    throw new Error("Imagen returned no data.");
  }

  const mime = generated.image?.mimeType ?? "image/png";
  return `data:${mime};base64,${bytes}`;
}

/**
 * Pollinations — often returns HTTP 402 (paid queue) for server-side use.
 * Kept for IMAGE_PROVIDER=pollinations only.
 */
async function generateViaPollinations({
  prompt,
  aspectRatio = "16:9",
}: GenerateImageOptions): Promise<string> {
  const { width, height } = ASPECT_PX[aspectRatio];
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${width}&height=${height}&model=sana&nologo=true&enhance=false`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(90_000),
    headers: { Accept: "image/*" },
  });

  if (!res.ok) {
    if (res.status === 402) {
      throw new Error(
        "Pollinations queue is full or requires payment (HTTP 402). Use Hugging Face or upload an image."
      );
    }
    throw new Error(
      `Pollinations image failed (${res.status}). Upload an image or configure HUGGINGFACE_API_KEY.`
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error(
      "Pollinations did not return an image. Upload a file or add HUGGINGFACE_API_KEY."
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

/** Hugging Face Inference — free monthly credits with a token. */
async function generateViaHuggingFace({
  prompt,
}: GenerateImageOptions): Promise<string> {
  const token = env.huggingfaceApiKey;
  if (!token) throw new Error("HUGGINGFACE_API_KEY not configured.");
  const model = env.huggingfaceImageModel;
  const res = await fetch(
    `https://router.huggingface.co/hf-inference/models/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify({ inputs: prompt }),
      signal: AbortSignal.timeout(90_000),
    }
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Hugging Face image failed (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`
    );
  }

  const contentType = res.headers.get("content-type") ?? "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType};base64,${buf.toString("base64")}`;
}

const SETUP_HINT =
  "Free Google keys have no image quota. Add HUGGINGFACE_API_KEY to .env.local " +
  "(free token at huggingface.co/settings/tokens) or upload an image manually.";

/**
 * Generate an image data URL.
 * Default chain (auto): Google → Hugging Face → Pollinations (if explicitly enabled).
 */
export async function generateImageDataUrl(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const providerPref = env.imageProvider;
  const errors: string[] = [];

  const tryGemini = async (): Promise<GenerateImageResult | null> => {
    if (env.aiProvider !== "gemini") return null;
    if (providerPref === "pollinations" || providerPref === "huggingface") {
      return null;
    }
    if (env.skipGoogleImage || isGoogleImageQuotaBlocked()) {
      errors.push("Google: skipped (free tier has no image quota)");
      return null;
    }
    const model = env.googleImageModel;
    try {
      const dataUrl = isImagenModel(model)
        ? await generateViaImagen({ ...options, model })
        : await generateViaGeminiImage({ ...options, model });
      return { dataUrl, provider: "gemini" };
    } catch (err) {
      errors.push(`Google: ${errorMessage(err).slice(0, 200)}`);
      if (isImageQuotaError(err)) {
        markGoogleImageQuotaBlocked();
      }
      if (!isImageQuotaError(err) && providerPref === "gemini") throw err;
      return null;
    }
  };

  const tryHf = async (): Promise<GenerateImageResult | null> => {
    if (!env.huggingfaceApiKey || providerPref === "pollinations") return null;
    try {
      const dataUrl = await generateViaHuggingFace(options);
      return { dataUrl, provider: "huggingface" };
    } catch (err) {
      errors.push(`Hugging Face: ${errorMessage(err).slice(0, 160)}`);
      return null;
    }
  };

  const tryPollinations = async (): Promise<GenerateImageResult | null> => {
    if (providerPref !== "pollinations" && providerPref !== "auto") return null;
    // Pollinations is unreliable (402 paywall) — only try when explicitly requested
    // or as a last resort in auto mode after HF fails.
    if (providerPref === "auto" && env.huggingfaceApiKey) return null;
    try {
      const dataUrl = await generateViaPollinations(options);
      return { dataUrl, provider: "pollinations" };
    } catch (err) {
      errors.push(`Pollinations: ${errorMessage(err).slice(0, 160)}`);
      return null;
    }
  };

  const runChain = async (
    order: Array<"gemini" | "huggingface" | "pollinations">
  ): Promise<GenerateImageResult | null> => {
    for (const step of order) {
      const result =
        step === "gemini"
          ? await tryGemini()
          : step === "huggingface"
            ? await tryHf()
            : await tryPollinations();
      if (result) return result;
    }
    return null;
  };

  let result: GenerateImageResult | null = null;

  if (providerPref === "pollinations") {
    result = await runChain(["pollinations"]);
  } else if (providerPref === "huggingface") {
    result = await runChain(["huggingface"]);
  } else if (providerPref === "gemini") {
    result = await runChain(["gemini"]);
  } else {
    // auto: Google (unless skipped) → Hugging Face → Pollinations (no HF key only)
    result = await runChain(["gemini", "huggingface", "pollinations"]);
  }

  if (result) return result;

  throw new Error(`${SETUP_HINT} (${errors.join(" | ")})`);
}
