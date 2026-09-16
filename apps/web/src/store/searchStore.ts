import { create } from "zustand";
import type { Repository } from "@repo-radar/types";
import { searchRepositories } from "../api/github";

interface SearchState {
  query: string;
  results: Repository[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;

  setQuery: (q: string) => void;
  run: (q: string) => Promise<void>;
}

/**
 * Cancellation is handled here rather than in the component.
 *
 * Without it, a slow request for "re" can resolve after a fast one for "react"
 * and overwrite the newer results — the classic search race condition. Each new
 * search aborts the previous one, and an aborted request is not treated as a
 * failure, because it isn't one.
 */
let inFlight: AbortController | null = null;

export const useSearchStore = create<SearchState>()((set) => ({
  query: "",
  results: [],
  status: "idle",
  error: null,

  setQuery: (q) =>
    set(
      q.trim()
        ? { query: q }
        : { query: q, results: [], status: "idle", error: null },
    ),

  run: async (q) => {
    inFlight?.abort();
    if (!q.trim()) return;

    const controller = new AbortController();
    inFlight = controller;

    set({ status: "loading", error: null });

    try {
      const res = await searchRepositories(q, controller.signal);
      if (controller.signal.aborted) return;
      set({ status: "success", results: res.items });
    } catch (e) {
      if (controller.signal.aborted) return; // superseded, not a failure
      set({
        status: "error",
        error: e instanceof Error ? e.message : "Search failed",
      });
    }
  },
}));
