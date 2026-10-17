import { parseRepository, createPullRequest, mergeWhenReady } from "./github.js";

export const DEFAULT_REPOSITORY = "Ziya235/Rivalio-App";
export const DEFAULT_CURSOR_MODEL = "composer-2.5";

export function readCodeTaskConfig(env = process.env) {
  const cursorApiKey = String(env.CURSOR_API_KEY ?? "").trim();
  const githubToken = String(env.GITHUB_TOKEN ?? "").trim();
  const repository = parseRepository(String(env.GITHUB_REPOSITORY ?? "").trim() || DEFAULT_REPOSITORY);
  const model = String(env.CURSOR_MODEL ?? "").trim() || DEFAULT_CURSOR_MODEL;
  const allowedUserIds = String(env.TELEGRAM_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const missing = [];
  if (!cursorApiKey) missing.push("CURSOR_API_KEY");
  if (!githubToken) missing.push("GITHUB_TOKEN");
  if (!repository) missing.push("GITHUB_REPOSITORY");
  if (allowedUserIds.length === 0) missing.push("TELEGRAM_ALLOWED_USER_IDS");
  return { cursorApiKey, githubToken, repository, model, allowedUserIds, missing, ready: missing.length === 0 };
}

export function isAllowedUser(userId, allowedUserIds) {
  return allowedUserIds.map(String).includes(String(userId));
}

export function buildTaskPrompt(instruction) {
  return [
    "Edit this repository on the cloud VM.",
    "Apply only the requested change. Leave unrelated files untouched.",
    "Commit the change on a new branch and open a pull request into main.",
    "Do not merge the pull request and do not push directly to main.",
    "Finish with a short summary that names the files you changed.",
    "",
    "Requested change:",
    instruction,
  ].join("\n");
}

function branchInfo(result, repoUrl) {
  const branches = result?.git?.branches ?? [];
  return branches.find((branch) => branch.repoUrl === repoUrl) || branches[0] || {};
}

export async function executeCodeTask({
  instruction,
  config,
  promptAgent,
  fetchImpl,
  mergeAttempts = 12,
  sleep,
}) {
  if (!config?.ready) {
    return {
      ok: false,
      userMessage: `Kod dəyişikliyi başlaya bilmədi. Çatışmayan dəyişənlər: ${config?.missing?.join(", ") || "config"}`,
    };
  }

  let result;
  try {
    result = await promptAgent(buildTaskPrompt(instruction), {
      apiKey: config.cursorApiKey,
      model: { id: config.model },
      cloud: {
        repos: [{ url: config.repository.url, startingRef: "main" }],
        autoCreatePR: true,
        skipReviewerRequest: true,
      },
    });
  } catch (error) {
    return {
      ok: false,
      userMessage: "Bulud agenti başlamadı. CURSOR_API_KEY və repo bağlantısını yoxla.",
      errorName: error?.name || "Error",
    };
  }

  if (result?.status !== "finished") {
    return {
      ok: false,
      userMessage: "Dəyişiklik tamamlanmadı. GitHub-da yeni commit olmaya bilər.",
    };
  }

  const info = branchInfo(result, config.repository.url);
  if (info.branch === "main" || info.branch === "master") {
    return {
      ok: true,
      merged: true,
      userMessage: `Dəyişiklik main branch-ə düşdü.\n${summarize(result)}`,
    };
  }

  let prUrl = info.prUrl || "";
  if (!prUrl && info.branch) {
    try {
      prUrl = await createPullRequest({
        token: config.githubToken,
        owner: config.repository.owner,
        repo: config.repository.repo,
        branch: info.branch,
        title: instruction,
        fetchImpl,
      });
    } catch (error) {
      return {
        ok: false,
        userMessage: "Branch yarandı, amma pull request açılmadı.",
        errorName: error?.name || "Error",
      };
    }
  }

  if (!prUrl) {
    return { ok: false, userMessage: "Agent bitirdi, amma pull request ünvanı qayıtmadı." };
  }

  try {
    await mergeWhenReady({
      token: config.githubToken,
      prUrl,
      fetchImpl,
      attempts: mergeAttempts,
      sleep,
    });
  } catch (error) {
    return {
      ok: false,
      prUrl,
      userMessage: `Pull request açıldı, amma merge olunmadı: ${prUrl}`,
      errorName: error?.name || "Error",
    };
  }

  return {
    ok: true,
    merged: true,
    prUrl,
    userMessage: `Dəyişiklik merge olundu: ${prUrl}\n${summarize(result)}`,
  };
}

function summarize(result) {
  const text = String(result?.result ?? "").trim();
  if (!text) return "";
  return text.length > 1200 ? `${text.slice(0, 1200)}…` : text;
}
