# Repo Radar

Search GitHub repositories, track the ones you care about, and monitor their stats.

**Live:** https://repo-radar-six.vercel.app
**Repository:** https://github.com/youssefhany96/repo-radar

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
pnpm lint         # lint every package
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

A keyed structure makes per-repository subscriptions straightforward. Each row
subscribes to its own stats entry, so refreshing one repository doesn't require
replacing the tracked-repository collection.

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

Both were permitted. For this scope, Zustand provides the required keyed state, async
actions, and persistence with less setup. Redux Toolkit would become more attractive
as state interactions, tooling requirements, and team conventions grow.

### Persistence via middleware, not inside an action

Zustand's `persist` middleware handles serialisation, with `partialize` controlling
what's written.

**Only repo identity is persisted, never stats.** Stats from a previous session are
stale by definition, and showing stale numbers as current is worse than showing
none — so restored repos start as `idle` and fetch fresh.

`localStorage` reads are validated rather than cast, because anything could be in
there: another tab, an older schema version, a user editing it by hand.

### Search and race conditions

The input updates immediately while a 400ms debounced value triggers the search.

Each new search aborts the previous request with `AbortController`, preventing a
slower stale response from overwriting newer results. Aborted requests are ignored
rather than surfaced as errors, because a cancellation isn't a failure.

### Last commit date

GitHub's repository endpoint exposes `pushed_at`, which is the last push rather than
necessarily the latest commit. The app therefore requests `/commits?per_page=1`
alongside repository stats.

The requests run in parallel and the commit lookup may fail independently. When
tracking from search, existing stars and issues stay visible while the commit date is
fetched in the background; if unavailable, the UI explicitly falls back to last-push.

### State ownership

Zustand holds tracked repos, search state, and theme preference. The active tab is
plain `useState`, because nothing else reads it.

Theme is the case worth explaining: `null` means "no explicit choice", so the app
follows the system preference and tracks OS changes live until the user toggles,
then remembers that choice across reloads. Local state would reset on every visit.

The rule: lift state when something else needs it, or when it has to outlive the
component.

### Chart dependency lives in the charts package

`recharts` is a dependency of `@repo-radar/charts` only — the app doesn't declare it
and never imports it. That's the practical test of whether the package boundary is
real: the app asks for a chart and passes labelled numbers, and the charting library
could be swapped for Chart.js or a hand-rolled SVG without the app changing at all.

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
- **Two API calls per refresh**, since the last commit date needs the commits
  endpoint as well as the repo endpoint.
- **Tracked repos are per-browser**, via `localStorage`. No accounts, no sync.
- **No end-to-end tests.** The unit and component tests cover the logic and render
  states; a Playwright test covering search → track → refresh → reload would be the
  next addition.

## Testing

`pnpm test` — 19 tests across the API layer, stores, and component behaviour.

Tests focus on regressions and architectural guarantees:

- **Commit fallback:** a failed commit request must not discard successfully fetched
  repository stats.
- **Per-repo independence:** one repository failing to refresh must not affect another.
- **Persistence:** repository identity is persisted, while stale stats are not.
- **Search race condition:** a superseded request must not overwrite newer results,
  and an aborted request must not surface as an error.

Component tests use roles and visible text rather than implementation-specific test
IDs. `RepoCard.test.tsx` lives in the app intentionally as a consumer-contract test:
it imports the shared component through `@repo-radar/ui` and exercises it with the
same state shapes the application uses.

## Optional extras included

- Light/dark theme, defaulting to system preference
- Compact number formatting and relative dates
- Per-repo error messages surfaced in a tooltip rather than swallowed
- ARIA labels on icon-only controls
