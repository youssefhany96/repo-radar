/**
 * Shared domain types.
 *
 * This package has no dependencies — not even React. It sits at the bottom of
 * the dependency graph so both the app and the UI packages can use it without
 * creating a cycle.
 */

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

/**
 * A tracked repo's live stats, fetched and refreshed independently.
 *
 * Status is a discriminated union rather than booleans: `isLoading` + `error` +
 * `data` as separate flags allows states that can't actually happen (loading
 * AND error), and the UI then has to guard against them. With a union, the
 * status determines exactly what's available.
 */
export type RepoStatsStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: RepoStats; fetchedAt: number }
  | { status: "error"; message: string };

export interface RepoStats {
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string;
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
