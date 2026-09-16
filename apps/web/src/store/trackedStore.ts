import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Repository, RepoStats, RepoStatsStatus, TrackedRepo } from "@repo-radar/types";
import { getRepoStats } from "../api/github";

/**
 * Tracked repos and their stats are two maps keyed by id, plus an order array.
 *
 * The obvious alternative — one array of repos with stats attached — makes
 * "independent loading state per repo" only appear to work. Refreshing one repo
 * means producing a new array, so every row re-renders.
 *
 * Keyed maps let a row subscribe to exactly its own slice:
 *   useTrackedStore((s) => s.stats[id])
 * and re-render alone when that one entry changes.
 */
interface TrackedState {
  repos: Record<number, TrackedRepo>;
  order: number[];
  stats: Record<number, RepoStatsStatus>;

  track: (repo: Repository) => void;
  untrack: (id: number) => void;
  refresh: (id: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useTrackedStore = create<TrackedState>()(
  persist(
    (set, get) => ({
      repos: {},
      order: [],
      stats: {},

      track: (r) => {
        if (get().repos[r.id]) return;
        set((s) => ({
          repos: {
            ...s.repos,
            [r.id]: {
              id: r.id,
              full_name: r.full_name,
              owner: r.owner.login,
              name: r.name,
              html_url: r.html_url,
              description: r.description,
              language: r.language,
            },
          },
          order: [...s.order, r.id],
          // Seeded from the search result so the row isn't blank before its
          // first refresh — search already gave us these numbers.
          stats: {
            ...s.stats,
            [r.id]: {
              status: "success",
              data: {
                stargazers_count: r.stargazers_count,
                open_issues_count: r.open_issues_count,
                pushed_at: r.pushed_at,
              },
              fetchedAt: Date.now(),
            },
          },
        }));
      },

      untrack: (id) =>
        set((s) => {
          const { [id]: _repo, ...repos } = s.repos;
          const { [id]: _stat, ...stats } = s.stats;
          return { repos, stats, order: s.order.filter((x) => x !== id) };
        }),

      refresh: async (id) => {
        const repo = get().repos[id];
        if (!repo) return;

        set((s) => ({ stats: { ...s.stats, [id]: { status: "loading" } } }));

        try {
          const data: RepoStats = await getRepoStats(repo.full_name);
          set((s) => ({
            stats: {
              ...s.stats,
              [id]: { status: "success", data, fetchedAt: Date.now() },
            },
          }));
        } catch (e) {
          set((s) => ({
            stats: {
              ...s.stats,
              [id]: {
                status: "error",
                message: e instanceof Error ? e.message : "Failed to refresh",
              },
            },
          }));
        }
      },

      // Sequential, not Promise.all. GitHub allows 60 unauthenticated requests
      // per hour — firing twenty at once is the quickest way to hit that wall.
      refreshAll: async () => {
        for (const id of get().order) {
          await get().refresh(id);
        }
      },
    }),
    {
      name: "repo-radar:tracked:v1",   // versioned, so the shape can change later
      storage: createJSONStorage(() => localStorage),

      /**
       * Only repo identity is persisted, never stats.
       *
       * Stats from a previous session are stale by definition, and showing stale
       * numbers as if current is worse than showing none.
       */
      partialize: (s) => ({ repos: s.repos, order: s.order }),

      /**
       * On rehydrate, mark everything idle so the UI knows it needs fresh stats.
       * Anything could be in localStorage — another tab, an older version, a
       * user editing it — so the shape is validated rather than trusted.
       */
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const order = state.order.filter((id) => Boolean(state.repos[id]));
        state.order = order;
        state.stats = Object.fromEntries(
          order.map((id) => [id, { status: "idle" } as RepoStatsStatus]),
        );
      },
    },
  ),
);
