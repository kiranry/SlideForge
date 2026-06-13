import "server-only";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import type { AiProvider, GenerateParams } from "./provider";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.googleApiKey });
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Transient errors worth retrying: high demand (503) and rate limits (429). */
function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const msg = (err as { message?: string })?.message ?? "";
  return (
    status === 503 ||
    status === 429 ||
    /UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(msg)
  );
}

export const geminiProvider: AiProvider = {
  name: "gemini",
  async generateText({
    system,
    user,
    maxTokens = 2000,
    temperature = 0.7,
    json = false,
  }: GenerateParams): Promise<string> {
    const ai = getClient();
    const maxAttempts = 4;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: env.googleModel,
          contents: user,
          config: {
            systemInstruction: system,
            maxOutputTokens: maxTokens,
            temperature,
            ...(json ? { responseMimeType: "application/json" } : {}),
          },
        });
        return (response.text ?? "").trim();
      } catch (err) {
        lastErr = err;
        if (attempt < maxAttempts && isRetryable(err)) {
          // Exponential backoff with jitter.
          await sleep(800 * 2 ** (attempt - 1) + Math.random() * 400);
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  },
};
