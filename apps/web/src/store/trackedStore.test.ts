import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Repository } from "@repo-radar/types";
import { useTrackedStore } from "./trackedStore";

/**
 * The behaviour worth testing here is that per-repo state is genuinely
 * independent — a failure on one repo must not affect another. That's the
 * requirement the keyed structure exists to satisfy.
 */

const repo = (id: number, full_name: string): Repository => ({
  id,
  full_name,
  name: full_name.split("/")[1] ?? full_name,
  owner: { login: full_name.split("/")[0] ?? "", avatar_url: "" },
  description: null,
  html_url: `https://github.com/${full_name}`,
  stargazers_count: 100,
  open_issues_count: 5,
  language: "TypeScript",
  pushed_at: "2026-09-01T00:00:00Z",
});

function reset() {
  useTrackedStore.setState({ repos: {}, order: [], stats: {} });
  localStorage.clear();
}

describe("trackedStore", () => {
  beforeEach(reset);
  afterEach(() => vi.unstubAllGlobals());

  it("tracks a repo and seeds stats from the search result", () => {
    useTrackedStore.getState().track(repo(1, "facebook/react"));

    const s = useTrackedStore.getState();
    expect(s.order).toEqual([1]);
    expect(s.repos[1]?.full_name).toBe("facebook/react");
    // Seeded so the row isn't blank before its first refresh
    expect(s.stats[1]).toMatchObject({ status: "success" });
  });

  it("ignores a repo that is already tracked", () => {
    const r = repo(1, "facebook/react");
    useTrackedStore.getState().track(r);
    useTrackedStore.getState().track(r);

    expect(useTrackedStore.getState().order).toEqual([1]);
  });

  it("removes repo, stats and ordering together on untrack", () => {
    useTrackedStore.getState().track(repo(1, "a/one"));
    useTrackedStore.getState().track(repo(2, "b/two"));
    useTrackedStore.getState().untrack(1);

    const s = useTrackedStore.getState();
    expect(s.order).toEqual([2]);
    expect(s.repos[1]).toBeUndefined();
    expect(s.stats[1]).toBeUndefined();   // no orphaned stats left behind
  });

  it("keeps per-repo state independent when one refresh fails", async () => {
    useTrackedStore.getState().track(repo(1, "good/repo"));
    useTrackedStore.getState().track(repo(2, "bad/repo"));

    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("bad/repo")) {
        return Promise.resolve(new Response("{}", { status: 500 }));
      }
      if (url.includes("/commits")) {
        return Promise.resolve(new Response(
          JSON.stringify([{ commit: { committer: { date: "2026-09-16T10:00:00Z" } } }]),
          { status: 200 },
        ));
      }
      return Promise.resolve(new Response(
        JSON.stringify({
          stargazers_count: 999,
          open_issues_count: 1,
          pushed_at: "2026-09-16T10:00:01Z",
        }),
        { status: 200 },
      ));
    }));

    await useTrackedStore.getState().refresh(2);   // fails
    await useTrackedStore.getState().refresh(1);   // succeeds

    const s = useTrackedStore.getState();
    expect(s.stats[2]?.status).toBe("error");
    expect(s.stats[1]?.status).toBe("success");
    // The failing repo left the successful one untouched — this is what
    // "independent loading and error states per repo" actually means.
    if (s.stats[1]?.status === "success") {
      expect(s.stats[1].data.stargazers_count).toBe(999);
    }
  });

  it("persists repo identity but not stats", async () => {
    useTrackedStore.getState().track(repo(1, "facebook/react"));

    const raw = localStorage.getItem("repo-radar:tracked:v1");
    expect(raw).toBeTruthy();

    const persisted = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(persisted.state).toHaveProperty("repos");
    expect(persisted.state).toHaveProperty("order");
    // Stats are stale by the next session — showing old numbers as current is
    // worse than showing none, so they are deliberately not persisted.
    expect(persisted.state).not.toHaveProperty("stats");
  });
});
