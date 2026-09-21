import type { GitHubSearchResponse, RepoStats } from "@repo-radar/types";

const BASE = "https://api.github.com";

// Unauthenticated: 60 requests/hour, 10 searches/minute.
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

interface RepoResponse {
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
}

interface CommitResponse {
  commit: { committer: { date: string } | null };
}

/**
 * Two calls: `pushed_at` is the last push, not the last commit. They run in
 * parallel, and the commit call may fail alone so a failure there doesn't
 * discard stars and issues.
 */
export async function getRepoStats(
  fullName: string,
  signal?: AbortSignal,
): Promise<RepoStats> {
  const [repo, commit] = await Promise.all([
    request<RepoResponse>(`/repos/${fullName}`, signal),
    request<CommitResponse[]>(`/repos/${fullName}/commits?per_page=1`, signal)
      .then((commits) => commits[0] ?? null)
      .catch(() => null),
  ]);

  return {
    stargazers_count: repo.stargazers_count,
    open_issues_count: repo.open_issues_count,
    pushed_at: repo.pushed_at,
    lastCommitDate: commit?.commit.committer?.date ?? null,
  };
}

export { GitHubError };
