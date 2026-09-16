# Repo Radar

Search GitHub repositories, track the ones you care about, and monitor their stats.

**Live:** _(add Vercel URL after deploying)_

---

## Running locally

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

```bash
pnpm build        # production build
pnpm typecheck    # type-check every package
```

Requires Node 20+ and pnpm 9+. No environment variables — the GitHub REST API is
used unauthenticated.

---

## Structure

```
repo-radar/
├─ apps/
│  └─ web/                 the application — routing, state, data fetching
└─ packages/
   ├─ types/               shared domain types (no dependencies at all)
   ├─ ui/                  presentational components (MUI)
   └─ charts/              visualisation components (Recharts)
```

**The dependency graph only points one way:**

```
web  →  ui  →  types
 │              ↑
 └──→ charts    │
 └──────────────┘
```

Nothing in `packages/` imports from `apps/`. That's the constraint that makes them
genuinely reusable rather than just relocated — you could drop `@repo-radar/ui`
into another app and it would work.

**Why three packages rather than one:**

- **`types`** has no dependencies, not even React. It sits at the bottom so both the
  app and `ui` can use it without a cycle.
- **`ui`** is presentational only. Components receive everything they render and
  report interactions upward. No store access, no fetching. That's what lets them
  be tested and reused independently.
- **`charts`** defines its own minimal `ChartDatum` shape rather than importing
  domain types. It charts labelled numbers and knows nothing about GitHub —
  mapping from repos to chart data happens in the app.

---

## Technical decisions

### Per-repo state is keyed, not nested

Tracked repos and their stats live in two maps keyed by id, with a separate `order`
array:

```ts
{ repos: Record<number, TrackedRepo>, order: number[], stats: Record<number, RepoStatsStatus> }
```

The obvious alternative — one array of repos with stats attached — makes
"independent loading and error state per repo" only *appear* to work. Refreshing
one repo means producing a new array, so every row re-renders.

With keyed maps, each row subscribes to its own slice and re-renders alone:

```tsx
const stats = useAppSelector((s) => s.tracked.stats[id]);
```

### Status as a discriminated union

```ts
type RepoStatsStatus =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: RepoStats; fetchedAt: number }
  | { status: "error"; message: string };
```

Separate `isLoading` / `error` / `data` fields allow combinations that can't actually
happen — loading *and* error — and then every component has to guard against them.
A union makes the invalid state unrepresentable: the status determines exactly what
data exists.

### Why Zustand over Redux Toolkit

Both were permitted. Zustand won on volume: the same behaviour — keyed per-repo
state, async refresh, persistence — in roughly half the code, with no provider, no
action types and no thunk boilerplate. Redux Toolkit earns its structure on large
teams with deeply shared state; this is one feature with two stores, and the
ceremony would have been cost without benefit.

The one thing Redux gives cheaply is devtools time-travel. Zustand supports the same
devtools middleware if that became valuable.

### Persistence via middleware, not inside an action

Zustand's `persist` middleware handles serialisation, with `partialize` controlling
what's written.

**Only repo identity is persisted, never stats.** Stats from a previous session are
stale by definition, and showing stale numbers as current is worse than showing
none — so restored repos start as `idle` and fetch fresh.

`localStorage` reads are validated rather than cast, because anything could be in
there: another tab, an older schema version, a user editing it by hand.

### Search debounces the value, not the request

```ts
const debouncedQuery = useDebounced(query, 400);
```

The input is driven by immediate state so typing stays responsive; only the
debounced value triggers a fetch. Debouncing the request itself would mean managing
timers next to network code.

### Race conditions

Each search aborts the previous one via `AbortController`, held in the store rather
than in the component. Without it a slow request for "re" can resolve after a fast
one for "react" and overwrite the newer results.

An aborted request is checked before writing state, so a cancellation is never shown
to the user as a failure — because it isn't one.

### On TanStack Query

The task specified Redux Toolkit or Zustand, so state is held in Zustand. In
production I'd reach for TanStack Query for the server-state half: per-repo caching,
stale-while-revalidate, deduplication and request cancellation are exactly this
problem, and each tracked repo would be its own query key with its own status —
which is precisely the "independent state per repo" requirement, handled by the
library rather than by hand.

What's here is effectively a small, purpose-built version of that. Zustand keeps the
client state it's genuinely good at: the tracked list and its ordering.

### Why Vite rather than Next.js

Nothing here needs a server. The app is a client-side dashboard against a public API
— no SEO surface, no server-side data fetching, no API routes. Next would add SSR
setup (including MUI's emotion cache) to solve problems this app doesn't have.

### Sequential refresh, not parallel

GitHub allows 60 unauthenticated requests per hour. `Promise.all` over twenty tracked
repos is the fastest way to hit that wall, so "refresh all" is sequential. Slower by
design, and the rate-limit response has its own error message rather than a generic
failure so users aren't retrying into the same wall.

---

## Assumptions and limitations

- **Unauthenticated API.** 60 requests/hour, 10 searches/minute. A token would raise
  this to 5,000/hour and would be the first change for real use.
- **No pagination** — search returns the top 20 by stars. The API supports more; it
  wasn't required here.
- **`pushed_at` is used for "last commit date."** It's the last push to any branch,
  which is what the search endpoint gives without a second request per repo. A true
  last-commit date would need `/commits` per repo, which the rate limit doesn't
  allow at this scale.
- **Tracked repos are per-browser**, via `localStorage`. No accounts, no sync.
- **No tests.** With more time: unit tests for the reducers and persistence
  validation, and a Playwright test covering search → track → refresh → persist.

## Optional extras included

- Light/dark theme, defaulting to system preference
- Compact number formatting and relative dates
- Per-repo error messages surfaced in a tooltip rather than swallowed
- ARIA labels on icon-only controls
