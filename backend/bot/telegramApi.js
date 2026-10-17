export function createTelegramClient({
  token,
  fetchImpl = fetch,
  timeoutMs = 15_000,
  pollTimeoutMs = 35_000,
}) {
  async function call(method, body, timeout = timeoutMs) {
    const response = await fetchImpl(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(timeout),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const error = new Error(`telegram_${method}_failed`);
      error.status = response.status;
      throw error;
    }
    return data.result;
  }

  return {
    sendMessage(chatId, text) {
      return call("sendMessage", { chat_id: chatId, text });
    },
    getUpdates(offset) {
      return call(
        "getUpdates",
        {
          ...(offset == null ? {} : { offset }),
          timeout: 25,
          allowed_updates: ["message"],
        },
        pollTimeoutMs,
      );
    },
    setWebhook({ url, secret }) {
      return call("setWebhook", {
        url,
        secret_token: secret,
        allowed_updates: ["message"],
        drop_pending_updates: false,
      });
    },
    deleteWebhook() {
      return call("deleteWebhook", { drop_pending_updates: false });
    },
  };
}

export function startPolling({ telegram, handleUpdate, log = () => {} }) {
  let stopped = false;

  const done = (async () => {
    let offset;
    while (!stopped) {
      try {
        const updates = await telegram.getUpdates(offset);
        const batch = Array.isArray(updates) ? updates : [];
        for (const update of batch) {
          if (typeof update?.update_id === "number") offset = update.update_id + 1;
          await handleUpdate(update);
        }
        if (batch.length === 0 && !stopped) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        if (stopped) break;
        log("error", "poll_failed", { status: error?.status, name: error?.name || "Error" });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  })();

  return {
    stop() {
      stopped = true;
    },
    done,
  };
}
