import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRepoStats } from "./github";

/**
 * These test the mapping and failure behaviour of the API layer, not fetch
 * itself. The valuable case is the third one: the commits call is allowed to
 * fail without discarding stats that were fetched successfully.
 */

const repoResponse = {
  stargazers_count: 1200,
  open_issues_count: 34,
  pushed_at: "2026-09-16T10:35:59Z",
};

const commitResponse = [
  { commit: { committer: { date: "2026-09-16T10:35:58Z" } } },
];

function mockFetch(handler: (url: string) => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) =>
    Promise.resolve(handler(String(input))),
  ));
}

const ok = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200 });

describe("getRepoStats", () => {
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("maps repo and commit responses into the domain model", async () => {
    mockFetch((url) =>
      url.includes("/commits") ? ok(commitResponse) : ok(repoResponse),
    );

    const stats = await getRepoStats("facebook/react");

    expect(stats).toEqual({
      stargazers_count: 1200,
      open_issues_count: 34,
      pushed_at: "2026-09-16T10:35:59Z",
      lastCommitDate: "2026-09-16T10:35:58Z",
    });
  });

  it("uses the commit date, which differs from pushed_at", async () => {
    mockFetch((url) =>
      url.includes("/commits") ? ok(commitResponse) : ok(repoResponse),
    );

    const stats = await getRepoStats("facebook/react");

    // The requirement is "last commit date" — pushed_at is the last push to any
    // branch and is not the same value.
    expect(stats.lastCommitDate).not.toBe(stats.pushed_at);
  });

  it("still returns stats when the commits call fails", async () => {
    mockFetch((url) =>
      url.includes("/commits")
        ? new Response("[]", { status: 409 })   // empty repository
        : ok(repoResponse),
    );

    const stats = await getRepoStats("someone/empty-repo");

    // Stars and issues were fetched successfully — one failing call must not
    // discard them. The UI falls back to last-push, labelled as such.
    expect(stats.stargazers_count).toBe(1200);
    expect(stats.lastCommitDate).toBeNull();
  });

  it("surfaces rate limiting with its own message", async () => {
    mockFetch(() =>
      new Response("{}", {
        status: 403,
        headers: { "x-ratelimit-remaining": "0" },
      }),
    );

    await expect(getRepoStats("facebook/react")).rejects.toThrow(/rate limit/i);
  });
});
