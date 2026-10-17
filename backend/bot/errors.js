const SECRET_KEY = /token|key|secret|authorization|password/i;

export function classifyAiError(error) {
  const status = error?.status;
  const code = String(error?.code || error?.error?.code || "");
  const name = String(error?.name || "");
  if (status === 429 || code === "rate_limit_exceeded") return "rateLimit";
  if (
    status === 408 ||
    code === "ETIMEDOUT" ||
    name === "APIConnectionTimeoutError" ||
    name === "TimeoutError" ||
    name === "AbortError"
  ) {
    return "timeout";
  }
  return "unavailable";
}

export function redactSecrets(value, secrets = []) {
  let text = String(value ?? "");
  for (const secret of secrets) {
    if (secret) text = text.split(secret).join("[redacted]");
  }
  return text;
}

export function safeMeta(meta, secrets = []) {
  if (!meta || typeof meta !== "object") return undefined;
  const copy = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SECRET_KEY.test(key)) continue;
    if (typeof value === "string") copy[key] = redactSecrets(value, secrets);
    else if (typeof value === "number" || typeof value === "boolean") copy[key] = value;
  }
  return copy;
}

export function createLogger(secrets = []) {
  return (level, message, meta) => {
    const sink = level === "error" ? console.error : console.info;
    const safeMessage = redactSecrets(message, secrets);
    const safe = safeMeta(meta, secrets);
    if (safe && Object.keys(safe).length > 0) sink(`[telegram-bot] ${safeMessage}`, safe);
    else sink(`[telegram-bot] ${safeMessage}`);
  };
}
