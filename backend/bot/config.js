export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const HISTORY_MESSAGE_LIMIT = 10;
export const MAX_USER_CHARS = 2000;
export const MAX_OUTPUT_TOKENS = 700;
export const OPENAI_TIMEOUT_MS = 25_000;
export const TELEGRAM_CHUNK_LIMIT = 4096;
export const WEBHOOK_PATH = "/api/telegram/webhook";

const WEBHOOK_SECRET_PATTERN = /^[-_A-Za-z0-9]{1,256}$/;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function webhookBaseUrl(env) {
  return (clean(env.TELEGRAM_WEBHOOK_URL) || clean(env.RENDER_EXTERNAL_URL)).replace(/\/$/, "");
}

/**
 * Validates bot configuration.
 * TELEGRAM_WEBHOOK_SECRET is required only when a public webhook URL is set
 * (explicit TELEGRAM_WEBHOOK_URL or Render's RENDER_EXTERNAL_URL).
 */
export function validateBotEnv(env = process.env) {
  const missing = [];
  const problems = [];
  const token = clean(env.TELEGRAM_BOT_TOKEN);
  const apiKey = clean(env.OPENAI_API_KEY);
  const model = clean(env.OPENAI_MODEL) || DEFAULT_OPENAI_MODEL;
  const secret = clean(env.TELEGRAM_WEBHOOK_SECRET);
  const baseUrl = webhookBaseUrl(env);

  if (!token) missing.push("TELEGRAM_BOT_TOKEN");
  if (!apiKey) missing.push("OPENAI_API_KEY");

  let mode = "polling";
  if (baseUrl) {
    mode = "webhook";
    let parsed = null;
    try {
      parsed = new URL(baseUrl);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== "https:") {
      problems.push("The webhook URL must be a valid https URL");
    }
    if (!secret) missing.push("TELEGRAM_WEBHOOK_SECRET");
    else if (!WEBHOOK_SECRET_PATTERN.test(secret)) {
      problems.push(
        "TELEGRAM_WEBHOOK_SECRET must be 1-256 characters and use only letters, numbers, underscore, or hyphen",
      );
    }
  }

  return {
    ok: missing.length === 0 && problems.length === 0,
    missing,
    problems,
    mode,
    model,
    token,
    apiKey,
    webhookSecret: secret,
    webhookUrl: baseUrl ? `${baseUrl}${WEBHOOK_PATH}` : "",
  };
}

export function formatBotConfigError(result) {
  const parts = [
    ...result.missing.map((name) => `missing ${name}`),
    ...result.problems,
  ];
  return parts.join("; ");
}
