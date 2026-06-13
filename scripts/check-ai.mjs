/**
 * Verifies the configured AI provider + API key work.
 *
 * Run with:
 *   npm run check:ai
 * which loads .env.local and makes one minimal generation call.
 */

const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function checkGemini() {
  const key = process.env.GOOGLE_API_KEY;
  const model = process.env.GOOGLE_MODEL || "gemini-2.5-flash";
  if (!key) {
    fail(
      "GOOGLE_API_KEY is empty. Add it to .env.local (get one at https://aistudio.google.com/apikey)."
    );
  }
  console.log(`Provider: gemini\nModel:    ${model}\nKey:      ${mask(key)}\n`);

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: key });
  const res = await ai.models.generateContent({
    model,
    contents: 'Reply with exactly the word: OK',
    config: { maxOutputTokens: 10, temperature: 0 },
  });
  return (res.text ?? "").trim();
}

async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
  if (!key) {
    fail(
      "ANTHROPIC_API_KEY is empty. Add it to .env.local (get one at https://console.anthropic.com/)."
    );
  }
  console.log(`Provider: anthropic\nModel:    ${model}\nKey:      ${mask(key)}\n`);

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: key });
  const res = await client.messages.create({
    model,
    max_tokens: 10,
    messages: [{ role: "user", content: "Reply with exactly the word: OK" }],
  });
  return res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

function mask(key) {
  if (key.length <= 8) return "********";
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

async function main() {
  console.log("Checking AI configuration…\n");
  try {
    const reply =
      provider === "anthropic" ? await checkAnthropic() : await checkGemini();
    console.log(`Model replied: "${reply}"`);
    console.log("\n✅ API key works. You're good to go.\n");
  } catch (err) {
    const status = err?.status ?? err?.response?.status;
    let hint = "";
    if (status === 401 || status === 403) {
      hint = " → The key was rejected (invalid or unauthorized).";
    } else if (status === 429) {
      hint = " → Rate limited / quota exceeded, but the key is valid.";
    } else if (status === 404) {
      hint = " → Model name not found. Check GOOGLE_MODEL / ANTHROPIC_MODEL.";
    }
    fail(`Request failed${status ? ` (HTTP ${status})` : ""}.${hint}\n   ${err?.message ?? err}`);
  }
}

main();
