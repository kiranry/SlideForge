import "server-only";
import { env } from "@/lib/env";
import type { AiProvider, GenerateParams } from "./provider";
import { geminiProvider } from "./gemini";
import { anthropicProvider } from "./anthropic";

export type { GenerateParams } from "./provider";

/** Resolve the active provider from AI_PROVIDER (defaults to Gemini). */
export function getProvider(): AiProvider {
  switch (env.aiProvider) {
    case "anthropic":
      return anthropicProvider;
    case "gemini":
    default:
      return geminiProvider;
  }
}

/**
 * Provider-agnostic text generation. The model is instructed (via the system
 * prompt) to return JSON; callers validate/parse with the appropriate Zod
 * schema. Pass `json: true` to also enable native JSON mode where supported.
 */
export function generateText(params: GenerateParams): Promise<string> {
  return getProvider().generateText(params);
}

/**
 * Strips accidental markdown fences (```json ... ```) that models sometimes
 * emit despite instructions, returning the inner JSON string.
 */
export function stripJsonFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : raw).trim();
}
