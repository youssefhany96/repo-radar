import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { Repository, RepoStatsStatus, TrackedRepo } from "@repo-radar/types";
import { getRepoStats } from "../api/github";

/**
 * Tracked repos and their stats are kept in separate maps, keyed by id.
 *
 * Why not one array of objects with stats attached? Because refreshing a single
 * repo would mean mapping the whole array and replacing it, so every row
 * re-renders even though one changed. Keyed maps mean a component can select
 * exactly its own slice and re-render alone — which is what makes the
 * "independent loading state per repo" requirement work properly rather than
 * just visually.
 */
interface TrackedState {
  repos: Record<number, TrackedRepo>;
  order: number[];                         // preserves insertion order
  stats: Record<number, RepoStatsStatus>;
}

const initialState: TrackedState = { repos: {}, order: [], stats: {} };

export const refreshRepo = createAsyncThunk(
  "tracked/refreshRepo",
  async (repo: { id: number; full_name: string }, { rejectWithValue }) => {
    try {
      const data = await getRepoStats(repo.full_name);
      return { id: repo.id, data };
    } catch (e) {
      return rejectWithValue({
        id: repo.id,
        message: e instanceof Error ? e.message : "Failed to refresh",
      });
    }
  },
);

const trackedSlice = createSlice({
  name: "tracked",
  initialState,
  reducers: {
    track(state, action: PayloadAction<Repository>) {
      const r = action.payload;
      if (state.repos[r.id]) return;
      state.repos[r.id] = {
        id: r.id,
        full_name: r.full_name,
        owner: r.owner.login,
        name: r.name,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
      };
      state.order.push(r.id);
      // Seed from search results so the row isn't empty before its first refresh
      state.stats[r.id] = {
        status: "success",
        data: {
          stargazers_count: r.stargazers_count,
          open_issues_count: r.open_issues_count,
          pushed_at: r.pushed_at,
        },
        fetchedAt: Date.now(),
      };
    },
    untrack(state, action: PayloadAction<number>) {
      delete state.repos[action.payload];
      delete state.stats[action.payload];
      state.order = state.order.filter((id) => id !== action.payload);
    },
    hydrate(state, action: PayloadAction<TrackedRepo[]>) {
      for (const r of action.payload) {
        state.repos[r.id] = r;
        state.order.push(r.id);
        // Deliberately idle, not success — persisted stats would be stale on
        // load, and showing stale numbers as current is worse than showing none.
        state.stats[r.id] = { status: "idle" };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshRepo.pending, (state, action) => {
        state.stats[action.meta.arg.id] = { status: "loading" };
      })
      .addCase(refreshRepo.fulfilled, (state, action) => {
        state.stats[action.payload.id] = {
          status: "success",
          data: action.payload.data,
          fetchedAt: Date.now(),
        };
      })
      .addCase(refreshRepo.rejected, (state, action) => {
        const p = action.payload as { id: number; message: string } | undefined;
        if (p) state.stats[p.id] = { status: "error", message: p.message };
      });
  },
});

export const { track, untrack, hydrate } = trackedSlice.actions;
export default trackedSlice.reducer;
