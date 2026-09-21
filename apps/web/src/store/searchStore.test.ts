import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useSearchStore } from "./searchStore";

const repo = (id: number, name: string) => ({
  id,
  full_name: name,
  name,
  owner: { login: "owner", avatar_url: "" },
  description: null,
  html_url: "",
  stargazers_count: 0,
  open_issues_count: 0,
  language: null,
  pushed_at: "2026-01-01T00:00:00Z",
});

const ok = (items: unknown[]) =>
  new Response(JSON.stringify({ total_count: items.length, incomplete_results: false, items }), {
    status: 200,
  });

function reset() {
  useSearchStore.setState({ query: "", results: [], status: "idle", error: null });
}

describe("searchStore", () => {
  beforeEach(reset);
  afterEach(() => vi.unstubAllGlobals());

  it("clearing the query resets results and status", () => {
    useSearchStore.setState({ query: "react", results: [repo(1, "a")], status: "success" });

    useSearchStore.getState().setQuery("");

    const s = useSearchStore.getState();
    expect(s.results).toEqual([]);
    expect(s.status).toBe("idle");
  });

  it("ignores an empty query rather than firing a request", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await useSearchStore.getState().run("   ");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  /**
   * The race condition the AbortController exists to prevent: a slow request for
   * "re" resolving after a fast one for "react" and overwriting newer results.
   */
  it("a superseded search cannot overwrite newer results", async () => {
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const slow = url.includes("q=re&");

      return new Promise<Response>((resolve, reject) => {
        const t = setTimeout(
          () => resolve(ok(slow ? [repo(1, "stale")] : [repo(2, "fresh")])),
          slow ? 50 : 5,
        );
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    }));

    const slow = useSearchStore.getState().run("re");     // starts first, resolves last
    const fast = useSearchStore.getState().run("react");  // aborts the first
    await Promise.all([slow, fast]);

    const s = useSearchStore.getState();
    expect(s.results.map((r) => r.name)).toEqual(["fresh"]);
    // The aborted request must not surface as a failure — it isn't one.
    expect(s.status).toBe("success");
    expect(s.error).toBeNull();
  });

  it("surfaces a failed search", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve(new Response("{}", { status: 500 })),
    ));

    await useSearchStore.getState().run("react");

    const s = useSearchStore.getState();
    expect(s.status).toBe("error");
    expect(s.error).toBeTruthy();
  });
});
