import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { Repository } from "@repo-radar/types";
import { searchRepositories } from "../api/github";

interface SearchState {
  query: string;
  results: Repository[];
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
}

const initialState: SearchState = { query: "", results: [], status: "idle", error: null };

export const search = createAsyncThunk(
  "search/run",
  async (query: string, { signal, rejectWithValue }) => {
    try {
      // createAsyncThunk gives us an AbortSignal that fires when the thunk is
      // superseded — so an older search can't resolve after a newer one and
      // overwrite the results. This is the classic search race condition.
      const res = await searchRepositories(query, signal);
      return res.items;
    } catch (e) {
      return rejectWithValue(e instanceof Error ? e.message : "Search failed");
    }
  },
  {
    // Skip empty queries entirely rather than firing a request that can't succeed
    condition: (query) => query.trim().length > 0,
  },
);

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setQuery(state, action: { payload: string }) {
      state.query = action.payload;
      if (!action.payload.trim()) {
        state.results = [];
        state.status = "idle";
        state.error = null;
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(search.pending, (s) => { s.status = "loading"; s.error = null; })
     .addCase(search.fulfilled, (s, a) => { s.status = "success"; s.results = a.payload; })
     .addCase(search.rejected, (s, a) => {
       if (a.meta.aborted) return;          // superseded, not a real failure
       s.status = "error";
       s.error = (a.payload as string) ?? "Search failed";
     });
  },
});

export const { setQuery } = searchSlice.actions;
export default searchSlice.reducer;
