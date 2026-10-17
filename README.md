# Rivalio Telegram AI bot

The Telegram bot runs inside the existing Express API. It is not part of the Vite frontend or the mobile app. A successful frontend deployment does not start the bot.

## 1. Architecture

- **Backend** (`backend/server.js`): Express 5 API on Node.js 22. The start command is `npm start`, which runs `node backend/server.js`. The same process serves the sports API, Socket.IO, and the Telegram bot.
- **Telegram bot** (`backend/bot/`): a text message from an allowed Telegram user starts a Cursor cloud agent. The agent edits `Ziya235/Rivalio-App` while the laptop is off, opens a pull request, and the backend merges it. The bot process itself must be running on Render, not on the laptop.
- **Frontend** (`frontend/`): Vite app. It talks to `VITE_API_URL` and never calls OpenAI.
- **Mobile** (`mobile/`): separate client. It does not call OpenAI.
- **Local mode**: long polling via `getUpdates`.
- **Render mode**: webhook. If `TELEGRAM_WEBHOOK_URL` is unset, the bot uses Render's `RENDER_EXTERNAL_URL` and registers `POST /api/telegram/webhook`.

Conversation history is kept in memory, separately for each chat, and capped at the last 10 messages. `/reset` clears only that chat. History is lost when the process restarts and is not shared across multiple instances.

## 2. Prerequisites

- Node.js 22 (the version used in CI and required by the OpenAI SDK)
- npm
- A Telegram account
- An OpenAI platform account with API billing or credits already available

Creating an API key does not add free credit. Requests fail until the account can pay for API usage.

## 3. Installation

From the repository root:

```bash
npm ci
```

`npm ci` installs backend dependencies, including the `openai` package, and generates the Prisma client. The bot does not need a database of its own. The existing sports API still needs its database settings to boot fully.

Frontend dependencies, only if you also run the website:

```bash
npm ci --prefix frontend
```

## 4. Environment variables

Copy the example file and edit the copy. Do not commit `.env`.

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Bot variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes, to start the bot | Kept for startup validation. Code changes do not call OpenAI. |
| `TELEGRAM_BOT_TOKEN` | Yes, for the bot | Token from BotFather. |
| `TELEGRAM_ALLOWED_USER_IDS` | Yes, for code changes | Numeric Telegram user ids, comma-separated. Send `/id` to the bot. |
| `CURSOR_API_KEY` | Yes, for code changes | Cursor user key from the dashboard integrations page. |
| `GITHUB_TOKEN` | Yes, for code changes | Token that can open and merge pull requests on this repo. |
| `GITHUB_REPOSITORY` | No | Defaults to `Ziya235/Rivalio-App`. |
| `CURSOR_MODEL` | No | Defaults to `composer-2.5`. |
| `TELEGRAM_WEBHOOK_SECRET` | Yes for webhook / Render | 1–256 characters: letters, numbers, `_`, `-`. |
| `TELEGRAM_WEBHOOK_URL` | No | Public `https` origin. On Render, omit this and use `RENDER_EXTERNAL_URL`. |

If `OPENAI_API_KEY` or `TELEGRAM_BOT_TOKEN` is missing, the sports API still starts and the bot stays off. The log names the missing variables and does not print secret values.

The sports API also uses `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, and `PORT`. Those are unrelated to the bot. Do not put any of these secrets in `frontend/.env.production` or other frontend files.

## 5. OpenAI API key

1. Open [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2. Create a secret key.
3. Set `OPENAI_API_KEY` in the local `.env` and in the host's environment settings.
4. Open billing at [https://platform.openai.com/settings/organization/billing](https://platform.openai.com/settings/organization/billing) and confirm the account has credits or an active payment method.

The key alone does not include free API usage. Optional: set `OPENAI_MODEL` to another model your project can access, such as `gpt-4.1-mini`. The default `gpt-4o-mini` is a lower-cost model already supported by the SDK.

## 6. Telegram bot token

1. In Telegram, open [@BotFather](https://t.me/BotFather).
2. Send `/newbot` and follow the prompts.
3. Copy the token into `TELEGRAM_BOT_TOKEN`.
4. For a public deployment, also set `TELEGRAM_WEBHOOK_SECRET` to a long random string, for example a UUID without braces.

Never send the token in chat, commit it, or put it in frontend code.

## 7. Run locally

From the repository root, with `.env` filled in and no `TELEGRAM_WEBHOOK_URL` or `RENDER_EXTERNAL_URL`:

```bash
npm start
```

For auto-reload during development:

```bash
npm run dev
```

Local mode uses polling. On startup the bot removes any previously registered webhook so polling can receive updates. You should see `[telegram-bot] polling_ready`.

The API listens on port `5000` unless `PORT` is set.

## 8. Change code from Telegram

The laptop can be off only after this backend is deployed on Render. A local `npm start` stops when the computer sleeps.

1. In Cursor, connect GitHub so cloud agents can push to `Ziya235/Rivalio-App`: [https://cursor.com/dashboard/integrations](https://cursor.com/dashboard/integrations).
2. Create a Cursor API key on that page and set `CURSOR_API_KEY`.
3. Create a GitHub token with access to this repository: Contents (read and write) and Pull requests (read and write). Set `GITHUB_TOKEN`.
4. Deploy the API service. Send `/id` to the bot, put that number in `TELEGRAM_ALLOWED_USER_IDS`, and restart the API.
5. Send `/start`, then a change such as `Landing page-də başlığı dəyiş`.
6. The bot replies that the job started. A cloud agent edits the repo, opens a pull request, and the backend merges it into `main`.
7. Another Telegram account that sends the same text gets a refusal and no agent run.

A merge to `main` can deploy the site if Render auto-deploy is on. Only the allow-listed Telegram user can start a job.

Automated tests mock Cursor, GitHub, and Telegram:

```bash
npm test
```

## 9. Deploy the backend

The production API is the existing Render web service (`rivalio-app.onrender.com`). It is configured in the Render dashboard. `render.yaml` deploys only the frontend and must not be treated as the bot service.

On the **API** service:

1. Confirm the start command is `npm start` (`node backend/server.js`).
2. Confirm the Node version is 22.
3. Set `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `CURSOR_API_KEY`, `GITHUB_TOKEN`, and `TELEGRAM_ALLOWED_USER_IDS`.
4. Leave `TELEGRAM_WEBHOOK_URL` empty so the bot uses `RENDER_EXTERNAL_URL`.
5. Deploy that API service. Render web services accept incoming HTTPS, which is what Telegram webhooks need.
6. After boot, logs should contain `[telegram-bot] webhook_ready`.

Webhook URL registered with Telegram:

`https://<your-api-host>/api/telegram/webhook`

The handler rejects requests that do not send the matching `X-Telegram-Bot-Api-Secret-Token` header.

Use one instance. Polling and multiple instances both drop or mix updates. History is in process memory.

The frontend service does not run this bot. Deploying `rivalio-app-frontend` only publishes the website.

This repository does not deploy or change GitHub settings by itself. Push and deploy only when you choose to.

## 10. Troubleshooting

| What you see | What to check |
| --- | --- |
| `[telegram-bot] Not started. missing OPENAI_API_KEY` | Set the variable on the same service that runs `npm start`, then restart. |
| `[telegram-bot] Not started. missing TELEGRAM_BOT_TOKEN` | Same as above, for the BotFather token. |
| `missing TELEGRAM_WEBHOOK_SECRET` on Render | Webhook mode is on because `RENDER_EXTERNAL_URL` exists. Set the secret and restart. |
| Bot is silent locally | Make sure `RENDER_EXTERNAL_URL` and `TELEGRAM_WEBHOOK_URL` are unset, restart, and confirm `polling_ready`. Another running copy of the bot using the same token will steal updates. |
| Bot is silent on Render | Confirm the API service is running, the webhook log line appeared, and the service URL is HTTPS. A sleeping free instance can delay the first reply. |
| Telegram says the AI service is temporarily unavailable | OpenAI returned an error. Typical causes: no billing/credits, a wrong API key, or an unknown `OPENAI_MODEL`. The process keeps running. |
| "The AI service is busy" | OpenAI rate limit. Wait and retry. The bot does not retry in a loop. |
| "The reply took too long" | The OpenAI call exceeded 25 seconds. Send the message again. |
| Photo, voice, or sticker gets a text-only reply | Only text messages are sent to the model. |
| `/start` works but normal text does not | `/start` does not call OpenAI. The key, model, or billing setup is the problem. |
| History disappeared | The server restarted, or someone sent `/reset` in that chat. |

Logs omit API keys, bot tokens, webhook secrets, and message text.

## 11. Cost and limits

Each normal text message is one OpenAI Responses API call. `/start`, `/reset`, `/help`, empty messages, unknown commands, non-text messages, and messages longer than 2000 characters do not call OpenAI.

Controls already in place:

- Default model `gpt-4o-mini` (override with `OPENAI_MODEL`)
- `max_output_tokens` of 700
- At most 10 stored messages per chat (about five exchanges), plus the new user message
- `store: false`, so OpenAI is not asked to keep the response for later retrieval
- No automatic retries

`gpt-4o-mini` is billed per input and output token. A short chat is usually a fraction of a cent, but long histories and higher-priced models cost more. Set a monthly budget and a usage alert in the OpenAI billing dashboard. There is no free allowance just because the key exists.

Telegram replies longer than 4096 characters are split into several messages.
