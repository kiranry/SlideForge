import "server-only";
import { env } from "@/lib/env";

export type ImageProviderId = "gemini" | "huggingface" | "pollinations";

export interface ImageProviderStatus {
  /** At least one provider can generate images with current env. */
  available: boolean;
  gemini: boolean;
  huggingface: boolean;
  pollinations: boolean;
  /** Short hint for the UI (no secrets). */
  hint: string;
}

/** In-process cache: free Google keys return limit:0 on every request. */
let googleImageQuotaBlocked = false;

export function markGoogleImageQuotaBlocked(): void {
  googleImageQuotaBlocked = true;
}

export function isGoogleImageQuotaBlocked(): boolean {
  return googleImageQuotaBlocked;
}

export function getImageProviderStatus(): ImageProviderStatus {
  const hasHf = Boolean(env.huggingfaceApiKey);
  const skipGoogle = env.skipGoogleImage || googleImageQuotaBlocked;
  const pref = env.imageProvider;

  const gemini =
    env.aiProvider === "gemini" &&
    pref !== "pollinations" &&
    pref !== "huggingface" &&
    !skipGoogle;

  const huggingface = hasHf && pref !== "pollinations" && pref !== "gemini";
  const pollinations = pref === "pollinations";

  const available =
    pref === "gemini"
      ? gemini
      : pref === "huggingface"
        ? huggingface
        : pref === "pollinations"
          ? pollinations
          : gemini || huggingface || pollinations;

  let hint: string;
  if (available && huggingface && !gemini) {
    hint =
      "Using Hugging Face for AI images (free Google keys have no image quota).";
  } else if (available && gemini) {
    hint = "AI images via Google Gemini.";
  } else if (available && pollinations) {
    hint =
      "Using Pollinations — may require payment or be rate-limited; upload is more reliable.";
  } else if (!hasHf) {
    hint =
      "Free Google keys cannot generate images. Add HUGGINGFACE_API_KEY to .env.local (free at huggingface.co/settings/tokens) or upload a file.";
  } else {
    hint = "Configure IMAGE_PROVIDER or check your API keys.";
  }

  return { available, gemini, huggingface, pollinations, hint };
}
