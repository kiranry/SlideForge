import "server-only";

export interface GenerateParams {
  /** System / instruction prompt. */
  system: string;
  /** User prompt. */
  user: string;
  maxTokens?: number;
  temperature?: number;
  /**
   * When true, ask the provider to return JSON. Providers that support a
   * native JSON mode (Gemini's responseMimeType) will use it; others rely on
   * the system prompt instructing JSON-only output.
   */
  json?: boolean;
}

export interface AiProvider {
  readonly name: string;
  generateText(params: GenerateParams): Promise<string>;
}
