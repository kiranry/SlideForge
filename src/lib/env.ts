/**
 * Server-only environment access. Importing this from a client component will
 * throw at build time, which is intentional — these values must never ship to
 * the browser.
 */
import "server-only";

export type AiProvider = "gemini" | "anthropic";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

export const env = {
  /** Which AI backend to use. Defaults to Gemini. */
  get aiProvider(): AiProvider {
    const raw = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    return raw === "anthropic" ? "anthropic" : "gemini";
  },

  /* Google Gemini */
  get googleApiKey() {
    return required("GOOGLE_API_KEY");
  },
  get googleModel() {
    return process.env.GOOGLE_MODEL || "gemini-2.5-flash-lite";
  },
  get googleImageModel() {
    return process.env.GOOGLE_IMAGE_MODEL || "gemini-2.5-flash-image";
  },

  /** auto = Gemini (unless skipped) → Hugging Face → Pollinations last resort. */
  get imageProvider(): "auto" | "gemini" | "pollinations" | "huggingface" {
    const raw = (process.env.IMAGE_PROVIDER || "auto").toLowerCase();
    if (raw === "gemini" || raw === "pollinations" || raw === "huggingface") {
      return raw;
    }
    return "auto";
  },

  /** Skip Google image API (free AI Studio keys have limit:0). Set to 1 on free keys. */
  get skipGoogleImage(): boolean {
    const raw = (process.env.SKIP_GOOGLE_IMAGE || "").toLowerCase();
    return raw === "1" || raw === "true" || raw === "yes";
  },

  get huggingfaceApiKey(): string | undefined {
    return process.env.HUGGINGFACE_API_KEY || undefined;
  },

  get huggingfaceImageModel(): string {
    return (
      process.env.HUGGINGFACE_IMAGE_MODEL ||
      "black-forest-labs/FLUX.1-schnell"
    );
  },

  /* Anthropic */
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get anthropicModel() {
    return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  },
};
