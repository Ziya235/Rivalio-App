import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatBotConfigError, validateBotEnv, WEBHOOK_PATH } from "../bot/config.js";
import { executeCodeTask, readCodeTaskConfig } from "../bot/codeTask.js";
import { classifyAiError, createLogger } from "../bot/errors.js";
import { createUpdateHandler } from "../bot/handler.js";
import { createHistoryStore } from "../bot/history.js";
import { BOT_MESSAGES } from "../bot/messages.js";
import { createOpenAiCompleter } from "../bot/openai.js";
import { splitTelegramText } from "../bot/splitText.js";
import { startPolling } from "../bot/telegramApi.js";
import { createWebhookHandler } from "../bot/webhook.js";

function mockResponse(req, res) {
  req.get = (name) => req.headers[name.toLowerCase()] || "";
  res.statusCode = 200;
  res.bodyEnded = false;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.end = () => {
    res.bodyEnded = true;
  };
  return { req, res };
}

describe("bot environment", () => {
  it("reports missing Telegram and OpenAI variables without secret values", () => {
    const result = validateBotEnv({});
    assert.equal(result.ok, false);
    assert.deepEqual(result.missing, ["TELEGRAM_BOT_TOKEN", "OPENAI_API_KEY"]);
    const message = formatBotConfigError(result);
    assert.match(message, /TELEGRAM_BOT_TOKEN/);
    assert.match(message, /OPENAI_API_KEY/);
    assert.equal(message.includes("sk-"), false);
  });

  it("uses polling locally and defaults the model", () => {
    const result = validateBotEnv({
      TELEGRAM_BOT_TOKEN: "123:token",
      OPENAI_API_KEY: "sk-test",
    });
    assert.equal(result.ok, true);
    assert.equal(result.mode, "polling");
    assert.equal(result.model, "gpt-4o-mini");
  });

  it("requires a webhook secret and https URL when a public origin is set", () => {
    const missingSecret = validateBotEnv({
      TELEGRAM_BOT_TOKEN: "123:token",
      OPENAI_API_KEY: "sk-test",
      RENDER_EXTERNAL_URL: "https://rivalio-app.onrender.com",
    });
    assert.equal(missingSecret.ok, false);
    assert.ok(missingSecret.missing.includes("TELEGRAM_WEBHOOK_SECRET"));

    const ready = validateBotEnv({
      TELEGRAM_BOT_TOKEN: "123:token",
      OPENAI_API_KEY: "sk-test",
      OPENAI_MODEL: "gpt-4.1-mini",
      RENDER_EXTERNAL_URL: "https://rivalio-app.onrender.com/",
      TELEGRAM_WEBHOOK_SECRET: "hook_secret",
    });
    assert.equal(ready.ok, true);
    assert.equal(ready.mode, "webhook");
    assert.equal(ready.model, "gpt-4.1-mini");
    assert.equal(ready.webhookUrl, `https://rivalio-app.onrender.com${WEBHOOK_PATH}`);

    const insecure = validateBotEnv({
      TELEGRAM_BOT_TOKEN: "123:token",
      OPENAI_API_KEY: "sk-test",
      TELEGRAM_WEBHOOK_URL: "http://example.com",
      TELEGRAM_WEBHOOK_SECRET: "hook_secret",
    });
    assert.equal(insecure.ok, false);
    assert.ok(insecure.problems.some((problem) => problem.includes("https")));
  });
});

describe("conversation history", () => {
  it("keeps chats separate, limits length, and resets one chat", () => {
    const history = createHistoryStore(4);
    history.appendExchange(1, "Salam", "Salam!");
    history.appendExchange(2, "Hello", "Hi!");
    history.appendExchange(1, "necəsən", "Yaxşıyam");
    history.appendExchange(1, "əlavə", "oldu");

    assert.deepEqual(
      history.get(1).map((message) => message.content),
      ["necəsən", "Yaxşıyam", "əlavə", "oldu"],
    );
    assert.equal(history.get(2)[0].content, "Hello");

    history.reset(1);
    assert.deepEqual(history.get(1), []);
    assert.equal(history.get(2).length, 2);
  });
});

describe("telegram text splitting", () => {
  it("splits long replies into chunks within Telegram's limit", () => {
    const text = `${"para ".repeat(900)}\n${"word ".repeat(900)}`;
    const chunks = splitTelegramText(text, 4096);
    assert.ok(chunks.length > 1);
    for (const chunk of chunks) {
      assert.ok(chunk.length > 0);
      assert.ok(chunk.length <= 4096);
    }
    assert.ok(chunks.join("").includes("para"));
    assert.ok(chunks.join("").includes("word"));
  });
});

describe("telegram update handler", () => {
  function setup() {
    const sent = [];
    const calls = [];
    const history = createHistoryStore();
    const handleUpdate = createUpdateHandler({
      history,
      log: () => {},
      complete: async ({ messages }) => {
        calls.push(messages);
        return "Cavab";
      },
      telegram: {
        sendMessage: async (chatId, text) => {
          sent.push({ chatId, text });
        },
      },
    });
    return { sent, calls, history, handleUpdate };
  }

  it("answers /start without calling the AI", async () => {
    const { sent, calls, handleUpdate } = setup();
    const result = await handleUpdate({
      update_id: 1,
      message: { chat: { id: 10 }, text: "/start" },
    });
    assert.equal(result.status, "start");
    assert.equal(calls.length, 0);
    assert.equal(sent[0].text, BOT_MESSAGES.start);
  });

  it("does not call the AI for a message over the length limit", async () => {
    const { calls, handleUpdate, sent } = setup();
    const result = await handleUpdate({
      update_id: 1,
      message: { chat: { id: 10 }, text: "a".repeat(2001) },
    });
    assert.equal(result.status, "too_long");
    assert.equal(calls.length, 0);
    assert.equal(sent[0].text, BOT_MESSAGES.tooLong);
  });

  it("rejects empty and unsupported messages without calling the AI", async () => {
    const { sent, calls, handleUpdate } = setup();
    assert.equal(
      (await handleUpdate({ update_id: 1, message: { chat: { id: 10 }, text: "   " } })).status,
      "empty",
    );
    assert.equal(
      (await handleUpdate({ update_id: 2, message: { chat: { id: 10 }, photo: [] } })).status,
      "unsupported",
    );
    assert.equal(calls.length, 0);
    assert.equal(sent[0].text, BOT_MESSAGES.empty);
    assert.equal(sent[1].text, BOT_MESSAGES.unsupported);
  });

  it("sends an AI reply and keeps follow-up context per chat", async () => {
    const { calls, history, handleUpdate } = setup();
    await handleUpdate({ update_id: 1, message: { chat: { id: 10 }, text: "Salam" } });
    await handleUpdate({ update_id: 2, message: { chat: { id: 11 }, text: "Hello" } });
    await handleUpdate({ update_id: 3, message: { chat: { id: 10 }, text: "davam et" } });

    assert.equal(calls.length, 3);
    const followUp = calls[2].map((message) => message.content);
    assert.ok(followUp.includes("Salam"));
    assert.equal(followUp.includes("Hello"), false);
    assert.equal(history.get(11).some((message) => message.content === "Hello"), true);

    await handleUpdate({ update_id: 4, message: { chat: { id: 10 }, text: "/reset" } });
    assert.deepEqual(history.get(10), []);
    assert.equal(history.get(11).length, 2);
  });

  it("does not call the AI again for a duplicate update", async () => {
    const { calls, handleUpdate } = setup();
    const update = { update_id: 7, message: { chat: { id: 10 }, text: "Salam" } };
    assert.equal((await handleUpdate(update)).status, "replied");
    assert.equal((await handleUpdate(update)).status, "duplicate");
    assert.equal(calls.length, 1);
  });

  it("returns a friendly message for API failures and keeps running", async () => {
    const cases = [
      [{ status: 429 }, BOT_MESSAGES.rateLimit],
      [{ name: "APIConnectionTimeoutError" }, BOT_MESSAGES.timeout],
      [{ status: 500 }, BOT_MESSAGES.unavailable],
    ];

    for (const [errorShape, expected] of cases) {
      const sent = [];
      const handleUpdate = createUpdateHandler({
        log: () => {},
        complete: async () => {
          const error = new Error("upstream");
          Object.assign(error, errorShape);
          throw error;
        },
        telegram: {
          sendMessage: async (chatId, text) => sent.push({ chatId, text }),
        },
      });
      const result = await handleUpdate({
        update_id: 1,
        message: { chat: { id: 3 }, text: "sual" },
      });
      assert.equal(sent.at(-1).text, expected);
      assert.notEqual(result.status, "failed");
    }
  });

  it("splits a long AI reply before sending", async () => {
    const sent = [];
    const handleUpdate = createUpdateHandler({
      log: () => {},
      complete: async () => `${"cavab ".repeat(1200)}`,
      telegram: {
        sendMessage: async (chatId, text) => sent.push(text),
      },
    });
    const result = await handleUpdate({
      update_id: 1,
      message: { chat: { id: 3 }, text: "uzun" },
    });
    assert.equal(result.status, "replied");
    assert.ok(result.chunks > 1);
    assert.equal(sent.length, result.chunks);
    for (const chunk of sent) assert.ok(chunk.length <= 4096);
  });

  it("does not crash when Telegram rejects the outgoing message", async () => {
    const handleUpdate = createUpdateHandler({
      log: () => {},
      complete: async () => "Cavab",
      telegram: {
        sendMessage: async () => {
          const error = new Error("telegram_sendMessage_failed");
          error.status = 403;
          throw error;
        },
      },
    });
    const result = await handleUpdate({
      update_id: 1,
      message: { chat: { id: 3 }, text: "Salam" },
    });
    assert.equal(result.status, "send_failed");
  });
});

describe("webhook auth", () => {
  it("rejects a request without the webhook secret", async () => {
    let called = false;
    const handler = createWebhookHandler({
      secret: "hook_secret",
      handleUpdate: async () => {
        called = true;
      },
    });
    const { req, res } = mockResponse(
      { headers: {}, body: { update_id: 1 } },
      {},
    );
    handler(req, res);
    assert.equal(res.statusCode, 401);
    assert.equal(called, false);
  });

  it("accepts a request with the matching secret", async () => {
    let body = null;
    const handler = createWebhookHandler({
      secret: "hook_secret",
      handleUpdate: async (update) => {
        body = update;
      },
    });
    const { req, res } = mockResponse(
      {
        headers: { "x-telegram-bot-api-secret-token": "hook_secret" },
        body: { update_id: 4 },
      },
      {},
    );
    handler(req, res);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(res.statusCode, 200);
    assert.equal(body.update_id, 4);
  });
});

describe("logging", () => {
  it("does not write secrets to logs", () => {
    const lines = [];
    const original = console.error;
    console.error = (...args) => lines.push(args.map(String).join(" "));
    try {
      const log = createLogger(["sk-live-key", "999:telegram-token"]);
      log("error", "failed with sk-live-key", {
        token: "999:telegram-token",
        status: 401,
        note: "header sk-live-key",
      });
    } finally {
      console.error = original;
    }
    const output = lines.join("\n");
    assert.equal(output.includes("sk-live-key"), false);
    assert.equal(output.includes("999:telegram-token"), false);
    assert.match(output, /\[redacted\]/);
  });
});

describe("AI errors", () => {
  it("classifies rate limits and timeouts", () => {
    assert.equal(classifyAiError({ status: 429 }), "rateLimit");
    assert.equal(classifyAiError({ name: "AbortError" }), "timeout");
    assert.equal(classifyAiError({ status: 401 }), "unavailable");
  });
});

describe("OpenAI client", () => {
  it("calls the Responses API with the configured model and mocked fetch", async () => {
    let requestUrl = "";
    let requestBody = null;
    let authorization = "";
    const fetchImpl = async (url, init) => {
      requestUrl = String(url);
      authorization = init.headers.get?.("authorization") || init.headers.Authorization || "";
      requestBody = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          id: "resp_test",
          object: "response",
          status: "completed",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [{ type: "output_text", text: "Salam, necəsən?" }],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };

    const completer = createOpenAiCompleter({
      apiKey: "sk-test-only",
      model: "gpt-4o-mini",
      fetchImpl,
    });
    const reply = await completer.complete({
      messages: [
        { role: "system", content: "Be brief." },
        { role: "user", content: "Salam" },
      ],
    });

    assert.equal(reply, "Salam, necəsən?");
    assert.match(requestUrl, /\/v1\/responses$/);
    assert.equal(requestBody.model, "gpt-4o-mini");
    assert.equal(requestBody.store, false);
    assert.equal(requestBody.max_output_tokens, 700);
    assert.equal(requestBody.input[0].content, "Salam");
    assert.match(authorization, /^Bearer /);
  });
});

describe("polling", () => {
  it("processes an update once and stops cleanly", async () => {
    const handled = [];
    let polls = 0;
    const polling = startPolling({
      log: () => {},
      handleUpdate: async (update) => {
        handled.push(update.update_id);
      },
      telegram: {
        getUpdates: async () => {
          polls += 1;
          if (polls === 1) return [{ update_id: 15, message: { text: "hi" } }];
          return [];
        },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    polling.stop();
    await polling.done;
    assert.deepEqual(handled, [15]);
  });
});

describe("code changes from Telegram", () => {
  const config = readCodeTaskConfig({
    CURSOR_API_KEY: "cursor_test",
    GITHUB_TOKEN: "github_test",
    TELEGRAM_ALLOWED_USER_IDS: "42",
    GITHUB_REPOSITORY: "Ziya235/Rivalio-App",
  });

  it("does not start an agent for a user who is not allowed", async () => {
    let called = false;
    const sent = [];
    const handleUpdate = createUpdateHandler({
      log: () => {},
      allowedUserIds: ["42"],
      runCodeTask: async () => {
        called = true;
        return { ok: true, userMessage: "merged" };
      },
      telegram: {
        sendMessage: async (chatId, text) => sent.push(text),
      },
    });
    const result = await handleUpdate({
      update_id: 1,
      message: { chat: { id: 9 }, from: { id: 7 }, text: "başlığı dəyiş" },
    });
    assert.equal(result.status, "forbidden");
    assert.equal(called, false);
    assert.equal(sent[0], BOT_MESSAGES.notAllowed);
  });

  it("asks the cloud agent to edit the repo and then merges the pull request", async () => {
    const calls = [];
    const fetches = [];
    const outcome = await executeCodeTask({
      instruction: "Landing başlığını dəyiş",
      config,
      mergeAttempts: 1,
      sleep: async () => {},
      promptAgent: async (prompt, options) => {
        calls.push({ prompt, options });
        return {
          status: "finished",
          result: "frontend/src/pages/Landing/data.ts dəyişdi",
          git: {
            branches: [{ repoUrl: "https://github.com/Ziya235/Rivalio-App", branch: "cursor/landing" }],
          },
        };
      },
      fetchImpl: async (url, init) => {
        fetches.push({ url: String(url), method: init?.method, body: init?.body });
        if (String(url).endsWith("/pulls")) {
          return new Response(JSON.stringify({ html_url: "https://github.com/Ziya235/Rivalio-App/pull/8" }), {
            status: 201,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ merged: true, sha: "abc" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    assert.equal(outcome.ok, true);
    assert.equal(outcome.merged, true);
    assert.match(outcome.userMessage, /pull\/8/);
    assert.equal(calls[0].options.cloud.autoCreatePR, true);
    assert.equal(calls[0].options.cloud.repos[0].url, "https://github.com/Ziya235/Rivalio-App");
    assert.equal(fetches[0].method, "POST");
    assert.equal(fetches[1].method, "PUT");
    assert.match(fetches[1].url, /\/pulls\/8\/merge$/);
  });

  it("does not merge when the agent fails", async () => {
    let fetched = false;
    const outcome = await executeCodeTask({
      instruction: "dəyiş",
      config,
      promptAgent: async () => ({ status: "error" }),
      fetchImpl: async () => {
        fetched = true;
        return new Response("{}", { status: 500 });
      },
    });
    assert.equal(outcome.ok, false);
    assert.equal(fetched, false);
  });

  it("reports missing code-task variables without calling the agent", async () => {
    let called = false;
    const outcome = await executeCodeTask({
      instruction: "dəyiş",
      config: readCodeTaskConfig({}),
      promptAgent: async () => {
        called = true;
      },
    });
    assert.equal(called, false);
    assert.match(outcome.userMessage, /CURSOR_API_KEY/);
    assert.match(outcome.userMessage, /GITHUB_TOKEN/);
    assert.match(outcome.userMessage, /TELEGRAM_ALLOWED_USER_IDS/);
  });
});
