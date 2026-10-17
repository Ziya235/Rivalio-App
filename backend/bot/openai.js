import OpenAI from "openai";
import { MAX_OUTPUT_TOKENS, OPENAI_TIMEOUT_MS } from "./config.js";

export function createOpenAiCompleter({
  apiKey,
  model,
  timeoutMs = OPENAI_TIMEOUT_MS,
  fetchImpl,
}) {
  const client = new OpenAI({
    apiKey,
    timeout: timeoutMs,
    maxRetries: 0,
    ...(fetchImpl ? { fetch: fetchImpl } : {}),
  });

  return {
    async complete({ messages }) {
      const system = messages.find((message) => message.role === "system");
      const input = messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content }));

      const response = await client.responses.create({
        model,
        instructions: system?.content,
        input,
        max_output_tokens: MAX_OUTPUT_TOKENS,
        store: false,
      });

      return String(response.output_text ?? "").trim();
    },
  };
}
