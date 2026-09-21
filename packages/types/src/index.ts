// Shared domain types. No dependencies, so nothing can create a cycle.

/** A repository as returned by the GitHub search API (the fields we use). */
export interface Repository {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  description: string | null;
  html_url: string;
  stargazers_count: number;
  open_issues_count: number;
  language: string | null;
  pushed_at: string;
}

/** A union rather than separate flags, so impossible states can't be represented. */
export type RepoStatsStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: RepoStats; fetchedAt: number }
  | { status: "error"; message: string };

export interface RepoStats {
  stargazers_count: number;
  open_issues_count: number;
  /** Last push to any branch — cheap, available on the repo endpoint. */
  pushed_at: string;
  /** From the commits endpoint. Null if that call failed or the repo is empty. */
  lastCommitDate: string | null;
}

/** The minimal shape we persist. Stats are always re-fetched, never restored. */
export interface TrackedRepo {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
}

export interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: Repository[];
}
