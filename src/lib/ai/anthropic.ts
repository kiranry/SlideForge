import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { AiProvider, GenerateParams } from "./provider";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return client;
}

export const anthropicProvider: AiProvider = {
  name: "anthropic",
  async generateText({
    system,
    user,
    maxTokens = 2000,
    temperature = 0.7,
  }: GenerateParams): Promise<string> {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: env.anthropicModel,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    });

    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
  },
};
