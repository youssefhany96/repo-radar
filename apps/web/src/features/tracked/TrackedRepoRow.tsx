import { memo } from "react";
import { RepoCard } from "@repo-radar/ui";
import { useAppDispatch, useAppSelector } from "../../store";
import { refreshRepo, untrack } from "../../store/trackedSlice";

/**
 * One row, subscribed only to its own slice of state.
 *
 * This is the point of keying stats by id: refreshing one repo re-renders one
 * row, not the list. With an array of repos-with-stats, every refresh would
 * produce a new array and re-render everything.
 */
export const TrackedRepoRow = memo(function TrackedRepoRow({ id }: { id: number }) {
  const dispatch = useAppDispatch();
  const repo = useAppSelector((s) => s.tracked.repos[id]);
  const stats = useAppSelector((s) => s.tracked.stats[id]);

  if (!repo) return null;

  return (
    <RepoCard
      fullName={repo.full_name}
      description={repo.description}
      language={repo.language}
      htmlUrl={repo.html_url}
      stats={stats}
      isTracked
      onUntrack={() => dispatch(untrack(id))}
      onRefresh={() => dispatch(refreshRepo({ id, full_name: repo.full_name }))}
    />
  );
});
