import { memo } from "react";
import { RepoCard } from "@repo-radar/ui";
import { useTrackedStore } from "../../store/trackedStore";

/**
 * One row, subscribed only to its own slice.
 *
 * Selecting `stats[id]` rather than the whole stats object means refreshing one
 * repo re-renders one row. That's what makes per-repo loading state real rather
 * than merely visual.
 */
export const TrackedRepoRow = memo(function TrackedRepoRow({ id }: { id: number }) {
  const repo = useTrackedStore((s) => s.repos[id]);
  const stats = useTrackedStore((s) => s.stats[id]);
  const untrack = useTrackedStore((s) => s.untrack);
  const refresh = useTrackedStore((s) => s.refresh);

  if (!repo) return null;

  return (
    <RepoCard
      fullName={repo.full_name}
      description={repo.description}
      language={repo.language}
      htmlUrl={repo.html_url}
      stats={stats}
      isTracked
      onUntrack={() => untrack(id)}
      onRefresh={() => void refresh(id)}
    />
  );
});
