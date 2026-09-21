import { useEffect, useMemo, useRef } from "react";
import { Stack, Button, Box, Paper } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { EmptyState } from "@repo-radar/ui";
import { StarsBarChart, type ChartDatum } from "@repo-radar/charts";
import { useTrackedStore } from "../../store/trackedStore";
import { TrackedRepoRow } from "./TrackedRepoRow";

export function TrackedPanel() {
  const order = useTrackedStore((s) => s.order);
  const repos = useTrackedStore((s) => s.repos);
  const stats = useTrackedStore((s) => s.stats);
  const refresh = useTrackedStore((s) => s.refresh);
  const refreshAll = useTrackedStore((s) => s.refreshAll);

  const anyLoading = order.some((id) => stats[id]?.status === "loading");
  // Ids currently being fetched, so an effect re-run doesn't duplicate work.
  const inFlight = useRef(new Set<number>());

  // Repos restored from localStorage come back as `idle`. Tracked per-repo
  // rather than with one "hydrated" flag, which deadlocks under StrictMode's
  // double-invoke. Sequential to stay inside GitHub's rate limit.
  useEffect(() => {
    const pending = order.filter(
      (id) => stats[id]?.status === "idle" && !inFlight.current.has(id),
    );
    if (pending.length === 0) return;

    pending.forEach((id) => inFlight.current.add(id));

    void (async () => {
      for (const id of pending) {
        await refresh(id);
        inFlight.current.delete(id);
      }
    })();
  }, [order, stats, refresh]);

  // Every tracked repo appears, so the bar count always matches the list.
  // A repo mid-refresh keeps its last known value rather than dropping to zero.
  const chartData: ChartDatum[] = useMemo(
    () =>
      order
        .map((id) => {
          const s = stats[id];
          const repo = repos[id];
          if (!repo) return null;

          // A repo mid-refresh keeps its last known value, so bars don't drop
          // to zero and reshuffle the sort for the duration of the request.
          const stars =
            s?.status === "success"
              ? s.data.stargazers_count
              : s?.status === "loading"
                ? (s.previous?.stargazers_count ?? 0)
                : 0;

          return { label: repo.name, value: stars };
        })
        .filter((d): d is ChartDatum => d !== null)
        .sort((a, b) => b.value - a.value),
    [order, stats, repos],
  );

  if (order.length === 0) {
    return (
      <EmptyState
        title="No tracked repositories"
        description="Search above and track a repository to start monitoring its stats."
      />
    );
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
        <StarsBarChart
          data={chartData}
          title="Stars per tracked repository"
          emptyMessage="No repositories tracked yet."
        />
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="small" startIcon={<RefreshIcon />}
          onClick={() => void refreshAll()} disabled={anyLoading}
        >
          Refresh all
        </Button>
      </Box>

      <Stack spacing={1.5}>
        {order.map((id) => <TrackedRepoRow key={id} id={id} />)}
      </Stack>
    </Stack>
  );
}
