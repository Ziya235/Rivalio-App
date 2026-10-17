const GITHUB_API = "https://api.github.com";

export function parseRepository(value) {
  const raw = String(value ?? "").trim().replace(/\.git$/, "");
  const match = raw.match(/github\.com[:/]([^/\s]+)\/([^/\s]+)$/i) || raw.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  return { owner, repo, url: `https://github.com/${owner}/${repo}` };
}

export function parsePullRequestUrl(value) {
  const match = String(value ?? "").match(/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "telegram-code-bot",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readGithubError(response) {
  const data = await response.json().catch(() => ({}));
  const error = new Error("github_request_failed");
  error.status = response.status;
  error.detail = typeof data.message === "string" ? data.message : "";
  return error;
}

export async function findOpenPullRequest({ token, owner, repo, branch, fetchImpl = fetch }) {
  const head = encodeURIComponent(`${owner}:${branch}`);
  const response = await fetchImpl(
    `${GITHUB_API}/repos/${owner}/${repo}/pulls?head=${head}&state=open`,
    { headers: githubHeaders(token) },
  );
  if (!response.ok) throw await readGithubError(response);
  const pulls = await response.json();
  const pull = Array.isArray(pulls) ? pulls[0] : null;
  return pull?.html_url || "";
}

export async function createPullRequest({ token, owner, repo, branch, title, fetchImpl = fetch }) {
  const response = await fetchImpl(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({
      title: String(title || "Telegram code change").slice(0, 72),
      head: branch,
      base: "main",
      body: "Opened from Telegram.",
    }),
  });
  if (response.status === 422) {
    return findOpenPullRequest({ token, owner, repo, branch, fetchImpl });
  }
  if (!response.ok) throw await readGithubError(response);
  const pull = await response.json();
  return pull.html_url || "";
}

export async function mergePullRequest({ token, prUrl, fetchImpl = fetch }) {
  const parsed = parsePullRequestUrl(prUrl);
  if (!parsed) {
    const error = new Error("invalid_pr_url");
    error.status = 400;
    throw error;
  }
  const response = await fetchImpl(
    `${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.number}/merge`,
    {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify({ merge_method: "merge" }),
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("github_merge_failed");
    error.status = response.status;
    error.detail = typeof data.message === "string" ? data.message : "";
    throw error;
  }
  return { merged: data.merged !== false, sha: data.sha || "" };
}

export async function mergeWhenReady({
  token,
  prUrl,
  fetchImpl = fetch,
  attempts = 12,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await mergePullRequest({ token, prUrl, fetchImpl });
    } catch (error) {
      lastError = error;
      const retry = error.status === 405 || error.status === 409;
      if (!retry || attempt === attempts - 1) throw error;
      await sleep(15_000);
    }
  }
  throw lastError;
}
