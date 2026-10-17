import { timingSafeEqual } from "node:crypto";
import { WEBHOOK_PATH } from "./config.js";

function secretsMatch(expected, provided) {
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createWebhookHandler({ secret, handleUpdate, log = () => {} }) {
  return function telegramWebhook(req, res) {
    const provided = req.get("x-telegram-bot-api-secret-token") || "";
    if (!secret || !secretsMatch(secret, provided)) {
      res.status(401).end();
      return;
    }

    res.status(200).end();
    Promise.resolve(handleUpdate(req.body)).catch((error) => {
      log("error", "webhook_failed", { name: error?.name || "Error" });
    });
  };
}

export function mountTelegramWebhook(app, options) {
  app.post(WEBHOOK_PATH, createWebhookHandler(options));
}
