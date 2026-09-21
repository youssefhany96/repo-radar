import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Repository,
  RepoStats,
  RepoStatsStatus,
  TrackedRepo,
} from "@repo-radar/types";
import { getRepoStats } from "../api/github";

// Stats are keyed by id so a row can subscribe to its own entry and re-render
// alone when it changes. `order` is separate because integer-like object keys
// are sorted numerically, not by insertion.
interface TrackedState {
  repos: Record<number, TrackedRepo>;
  order: number[];
  stats: Record<number, RepoStatsStatus>;

  track: (repo: Repository) => void;
  untrack: (id: number) => void;
  /** `silent` skips the loading state for background upgrades. */
  refresh: (id: number, options?: { silent?: boolean }) => Promise<void>;
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
                lastCommitDate: null,
              },
              fetchedAt: Date.now(),
            },
          },
        }));

        // Search has no commit data — upgrade last-push to last-commit.
        void get().refresh(r.id, { silent: true });
      },

      untrack: (id) =>
        set((s) => {
          const { [id]: _repo, ...repos } = s.repos;
          const { [id]: _stat, ...stats } = s.stats;
          return { repos, stats, order: s.order.filter((x) => x !== id) };
        }),

      refresh: async (id, options) => {
        const repo = get().repos[id];
        if (!repo) return;

        // Don't blank stats already on screen for a refresh nobody asked for.
        if (!options?.silent) {
          set((s) => {
            const current = s.stats[id];
            return {
              stats: {
                ...s.stats,
                [id]: {
                  status: "loading",
                  // Carried so consumers can keep showing the last known values
                  // rather than dropping to nothing mid-request.
                  previous: current?.status === "success" ? current.data : undefined,
                },
              },
            };
          });
        }

        try {
          const data: RepoStats = await getRepoStats(repo.full_name);
          set((s) => ({
            stats: {
              ...s.stats,
              [id]: { status: "success", data, fetchedAt: Date.now() },
            },
          }));
        } catch (e) {
          // Background upgrade failed — keep the seeded stats.
          if (options?.silent) return;
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

      // Sequential to avoid bursting GitHub's 60 req/hour limit.
      refreshAll: async () => {
        for (const id of get().order) {
          await get().refresh(id);
        }
      },
    }),
    {
      name: "repo-radar:tracked:v1", // versioned, so the shape can change later
      storage: createJSONStorage(() => localStorage),

      // Identity only — stats from a previous session would be stale.
      partialize: (s) => ({ repos: s.repos, order: s.order }),

      // Mark everything idle on rehydrate, and drop entries with no repo —
      // localStorage can't be trusted.
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
