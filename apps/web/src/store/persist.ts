import type { Middleware } from "@reduxjs/toolkit";
import type { TrackedRepo } from "@repo-radar/types";
import type { RootState } from "./index";

const KEY = "repo-radar:tracked:v1";   // versioned, so the shape can change later

/**
 * Persistence as middleware rather than inside the reducer.
 *
 * Reducers must stay pure — writing to localStorage from one is a side effect,
 * and it breaks time-travel debugging and makes the reducer untestable without
 * a DOM. Middleware is the correct seam for this.
 *
 * Only the repo identity is persisted, never the stats. Stats from a previous
 * session are stale by definition, and showing stale numbers as if they were
 * current is worse than showing none.
 */
export const persistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  if (typeof action === "object" && action !== null && "type" in action) {
    const type = (action as { type: string }).type;
    if (type.startsWith("tracked/track") || type.startsWith("tracked/untrack")) {
      const state = store.getState() as RootState;
      const repos = state.tracked.order
        .map((id) => state.tracked.repos[id])
        .filter((r): r is TrackedRepo => Boolean(r));
      try {
        localStorage.setItem(KEY, JSON.stringify(repos));
      } catch {
        // Quota exceeded or private mode — the app still works, it just won't
        // remember. Failing silently is correct here; a crash is not.
      }
    }
  }
  return result;
};

export function loadPersisted(): TrackedRepo[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Anything could be in localStorage — another tab, an older version, a user
    // editing it. Validate rather than trusting the cast.
    return parsed.filter(
      (r): r is TrackedRepo =>
        typeof r === "object" && r !== null &&
        typeof (r as TrackedRepo).id === "number" &&
        typeof (r as TrackedRepo).full_name === "string",
    );
  } catch {
    return [];
  }
}
