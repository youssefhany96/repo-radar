import type { GitHubSearchResponse, RepoStats } from "@repo-radar/types";

const BASE = "https://api.github.com";

/**
 * GitHub's unauthenticated rate limit is 60 requests/hour for the REST API and
 * 10/minute for search. That's the main real-world constraint here — it's why
 * search is debounced and why "refresh all" is sequential rather than parallel.
 */
class GitHubError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) {
    // Rate limiting deserves its own message — "request failed" would leave the
    // user retrying into the same wall.
    if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
      throw new GitHubError("GitHub rate limit reached. Try again shortly.", 403);
    }
    if (res.status === 404) throw new GitHubError("Repository not found.", 404);
    throw new GitHubError(`GitHub request failed (${res.status}).`, res.status);
  }

  return res.json() as Promise<T>;
}

export function searchRepositories(query: string, signal?: AbortSignal) {
  const q = encodeURIComponent(query);
  return request<GitHubSearchResponse>(
    `/search/repositories?q=${q}&sort=stars&order=desc&per_page=20`,
    signal,
  );
}

export function getRepoStats(fullName: string, signal?: AbortSignal) {
  return request<RepoStats>(`/repos/${fullName}`, signal);
}

export { GitHubError };
