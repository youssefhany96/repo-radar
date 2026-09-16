import { useEffect, useMemo } from "react";
import { Stack, Button, Box, Paper } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { EmptyState } from "@repo-radar/ui";
import { StarsBarChart, type ChartDatum } from "@repo-radar/charts";
import { useAppDispatch, useAppSelector } from "../../store";
import { refreshRepo } from "../../store/trackedSlice";
import { TrackedRepoRow } from "./TrackedRepoRow";

export function TrackedPanel() {
  const dispatch = useAppDispatch();
  const order = useAppSelector((s) => s.tracked.order);
  const repos = useAppSelector((s) => s.tracked.repos);
  const stats = useAppSelector((s) => s.tracked.stats);

  const anyLoading = order.some((id) => stats[id]?.status === "loading");

  // On mount, fetch stats for anything restored from localStorage as `idle`.
  // Sequential rather than parallel: GitHub allows 60 unauthenticated requests
  // per hour, and firing twenty at once is the fastest way to hit that wall.
  useEffect(() => {
    const stale = order.filter((id) => stats[id]?.status === "idle");
    if (stale.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const id of stale) {
        if (cancelled) return;
        const repo = repos[id];
        if (repo) await dispatch(refreshRepo({ id, full_name: repo.full_name }));
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData: ChartDatum[] = useMemo(
    () =>
      order
        .map((id) => {
          const s = stats[id];
          const repo = repos[id];
          if (!repo || s?.status !== "success") return null;
          return { label: repo.name, value: s.data.stargazers_count };
        })
        .filter((d): d is ChartDatum => d !== null)
        .sort((a, b) => b.value - a.value),
    [order, stats, repos],
  );

  const refreshAll = async () => {
    for (const id of order) {
      const repo = repos[id];
      if (repo) await dispatch(refreshRepo({ id, full_name: repo.full_name }));
    }
  };

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
      <Paper variant="outlined" sx={{ p: 2 }}>
        <StarsBarChart
          data={chartData}
          title="Stars per tracked repository"
          emptyMessage="Refresh to load star counts."
        />
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          size="small" startIcon={<RefreshIcon />}
          onClick={refreshAll} disabled={anyLoading}
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
