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
pnpm test         # run the test suite
```

Requires Node 20+ and pnpm 11+ (or Corepack, which will pick up the `packageManager`
field automatically). No environment variables — the GitHub REST API is used
unauthenticated.

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

A keyed structure makes per-repository subscriptions straightforward: refreshing one
repo replaces one entry rather than the whole collection, so a row can subscribe to
exactly its own slice. An array of repos-with-stats can be made to work with careful
selectors and memoisation, but the keyed shape makes the cheap path the default one
rather than something you have to remember to do.

Each row subscribes to its own entry:

```tsx
const stats = useTrackedStore((state) => state.stats[id]);
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

### Last commit date needs a second request

The repo endpoint gives stars and open issues in one call, but its `pushed_at` field
is the last push to any branch — not the same as the last commit. Getting the real
value means `/repos/{owner}/{repo}/commits?per_page=1`.

Both calls fire in parallel since neither depends on the other, and the commits call
is wrapped so it can fail alone. An empty repository has no commits at all, and a
rate-limit response on one request shouldn't throw away a successful response to the
other. When it's unavailable the UI shows last-push instead, labelled as such, rather
than silently presenting one as the other.

### Chart dependency lives in the charts package

`recharts` is a dependency of `@repo-radar/charts` only — the app doesn't declare it
and never imports it. That's the practical test of whether the package boundary is
real: the app asks for a chart and passes labelled numbers, and the charting library
could be swapped for Chart.js or a hand-rolled SVG without the app changing at all.

Shared libraries that *do* cross the boundary — React, MUI, emotion — are kept on a
single version across the workspace. Two copies of MUI resolving in one build gives
you two theme contexts and a build that fails in ways that don't point at the cause.

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
- **Two API calls per refresh.** `pushed_at` from the repo endpoint is not the last
  commit date — a push can contain commits authored earlier, and force-pushes move it
  without a new commit — so the commits endpoint is queried alongside it. They run in
  parallel, and the commit call is allowed to fail independently: an empty repo has no
  commits, and one failure shouldn't discard stars and issues that were fetched
  successfully. The card falls back to last-push with a label saying so.
- **Tracked repos are per-browser**, via `localStorage`. No accounts, no sync.
- **No end-to-end tests.** The unit and component tests cover the logic and render
  states; a Playwright test covering search → track → refresh → reload would be the
  next addition.

## Testing

`pnpm test` — 14 tests across the API layer, the store, and the card component.

They're deliberately few and aimed at behaviour that could actually break, rather
than at a coverage number. The three that earn their place:

**The commit fallback.** When `/commits` fails — an empty repository, or a rate
limit — the stats that *were* fetched must survive, and the UI must say "last push"
rather than silently presenting a push date as a commit date. Tested at both layers.

**Per-repo independence.** One repo's refresh failing must leave another repo's
successful state untouched. That's the requirement the keyed store shape exists to
satisfy, so it's worth asserting rather than assuming.

**What is and isn't persisted.** Repo identity is written to `localStorage`; stats
deliberately are not, because stale numbers shown as current are worse than none.

Component tests query by role and visible text rather than test IDs, so they break
when the feature breaks and survive a refactor. Deliberately not tested: that MUI
renders a button, or that a prop reaches a child.

## Optional extras included

- Light/dark theme, defaulting to system preference
- Compact number formatting and relative dates
- Per-repo error messages surfaced in a tooltip rather than swallowed
- ARIA labels on icon-only controls
