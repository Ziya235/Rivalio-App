import { HISTORY_MESSAGE_LIMIT, MAX_USER_CHARS } from "./config.js";
import { isAllowedUser } from "./codeTask.js";
import { classifyAiError } from "./errors.js";
import { createHistoryStore } from "./history.js";
import { BOT_MESSAGES, SYSTEM_PROMPT, parseCommand } from "./messages.js";
import { splitTelegramText } from "./splitText.js";

function createDeduper(maxSize = 1000) {
  const ids = new Set();
  const order = [];
  return {
    remember(updateId) {
      if (ids.has(updateId)) return false;
      ids.add(updateId);
      order.push(updateId);
      if (order.length > maxSize) {
        const oldest = order.shift();
        ids.delete(oldest);
      }
      return true;
    },
  };
}

async function safeSend(telegram, chatId, text, log) {
  try {
    await telegram.sendMessage(chatId, text);
  } catch (error) {
    log("error", "telegram_send_failed", { status: error?.status, chatId });
  }
}

export function createUpdateHandler({
  complete,
  runCodeTask,
  allowedUserIds = [],
  telegram,
  history = createHistoryStore(HISTORY_MESSAGE_LIMIT),
  log = () => {},
  deduper = createDeduper(),
}) {
  const tails = new Map();
  let codeTaskBusy = false;

  function enqueue(chatId, task) {
    const previous = tails.get(chatId) ?? Promise.resolve();
    const run = previous.catch(() => {}).then(task);
    tails.set(
      chatId,
      run.then(
        () => {},
        () => {},
      ),
    );
    return run;
  }

  async function processUpdate(update) {
    const message = update.message;
    if (!message || message.chat?.id == null) return { status: "ignored" };

    const chatId = message.chat.id;
    const text = typeof message.text === "string" ? message.text.trim() : "";

    if (!text) {
      const status = typeof message.text === "string" ? "empty" : "unsupported";
      await safeSend(telegram, chatId, BOT_MESSAGES[status], log);
      return { status };
    }

    const command = parseCommand(text);
    if (command === "start" || command === "help") {
      await safeSend(telegram, chatId, runCodeTask ? BOT_MESSAGES.codeStart : BOT_MESSAGES.start, log);
      return { status: "start" };
    }
    if (command === "id") {
      const userId = message.from?.id ?? "unknown";
      await safeSend(telegram, chatId, `Telegram user id: ${userId}`, log);
      return { status: "id" };
    }
    if (command === "reset") {
      history.reset(chatId);
      await safeSend(telegram, chatId, BOT_MESSAGES.reset, log);
      return { status: "reset" };
    }
    if (command) {
      await safeSend(telegram, chatId, BOT_MESSAGES.unknownCommand, log);
      return { status: "unknown_command" };
    }
    if (text.length > MAX_USER_CHARS) {
      await safeSend(telegram, chatId, BOT_MESSAGES.tooLong, log);
      return { status: "too_long" };
    }

    if (runCodeTask) {
      const userId = message.from?.id;
      if (!isAllowedUser(userId, allowedUserIds)) {
        await safeSend(telegram, chatId, BOT_MESSAGES.notAllowed, log);
        return { status: "forbidden" };
      }
      if (codeTaskBusy) {
        await safeSend(telegram, chatId, BOT_MESSAGES.taskBusy, log);
        return { status: "busy" };
      }
      codeTaskBusy = true;
      await safeSend(telegram, chatId, BOT_MESSAGES.taskStarted, log);
      try {
        const outcome = await runCodeTask(text);
        const reply = outcome?.userMessage || BOT_MESSAGES.unavailable;
        for (const chunk of splitTelegramText(reply)) {
          await telegram.sendMessage(chatId, chunk);
        }
        return { status: outcome?.ok ? "merged" : "task_failed" };
      } catch (error) {
        log("error", "code_task_failed", { name: error?.name || "Error", chatId });
        await safeSend(telegram, chatId, BOT_MESSAGES.unavailable, log);
        return { status: "task_failed" };
      } finally {
        codeTaskBusy = false;
      }
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.get(chatId),
      { role: "user", content: text },
    ];

    let reply = "";
    try {
      reply = String((await complete({ messages })) ?? "").trim();
    } catch (error) {
      const status = classifyAiError(error);
      log("error", "ai_request_failed", { status: error?.status, kind: status, chatId });
      await safeSend(telegram, chatId, BOT_MESSAGES[status], log);
      return { status };
    }

    if (!reply) {
      await safeSend(telegram, chatId, BOT_MESSAGES.unavailable, log);
      return { status: "empty_reply" };
    }

    const chunks = splitTelegramText(reply);
    try {
      for (const chunk of chunks) {
        await telegram.sendMessage(chatId, chunk);
      }
    } catch (error) {
      log("error", "telegram_send_failed", { status: error?.status, chatId });
      return { status: "send_failed" };
    }

    history.appendExchange(chatId, text, reply);
    return { status: "replied", chunks: chunks.length };
  }

  return async function handleUpdate(update) {
    try {
      if (!update || typeof update.update_id !== "number") return { status: "ignored" };
      if (!deduper.remember(update.update_id)) return { status: "duplicate" };
      const chatId = update.message?.chat?.id;
      if (chatId == null) return { status: "ignored" };
      return await enqueue(String(chatId), () => processUpdate(update));
    } catch (error) {
      log("error", "update_failed", { name: error?.name || "Error" });
      return { status: "failed" };
    }
  };
}
