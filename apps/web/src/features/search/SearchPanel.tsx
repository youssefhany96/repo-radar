import { useEffect } from "react";
import { Stack, Typography, CircularProgress, Box } from "@mui/material";
import { RepoCard, SearchField, EmptyState, ErrorState } from "@repo-radar/ui";
import { useSearchStore } from "../../store/searchStore";
import { useTrackedStore } from "../../store/trackedStore";
import { useDebounced } from "../../hooks/useDebounced";

export function SearchPanel() {
  const { query, results, status, error, setQuery, run } = useSearchStore();
  const repos = useTrackedStore((s) => s.repos);
  const track = useTrackedStore((s) => s.track);
  const untrack = useTrackedStore((s) => s.untrack);

  const debouncedQuery = useDebounced(query, 400);

  useEffect(() => {
    void run(debouncedQuery);
  }, [debouncedQuery, run]);

  return (
    <Stack spacing={2}>
      <SearchField
        value={query}
        onChange={setQuery}
        loading={status === "loading"}
        placeholder="Search GitHub repositories…"
      />

      {status === "error" && error && (
        <ErrorState message={error} onRetry={() => void run(debouncedQuery)} />
      )}

      {status === "idle" && !query && (
        <EmptyState
          title="Search for a repository"
          description="Find repositories on GitHub and track the ones you care about."
        />
      )}

      {status === "loading" && results.length === 0 && (
        <Box sx={{ display: "grid", placeItems: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {status === "success" && results.length === 0 && (
        <EmptyState title="No results" description={`Nothing matched “${debouncedQuery}”.`} />
      )}

      {results.length > 0 && (
        <>
          <Typography variant="caption" color="text.secondary">
            {results.length} result{results.length === 1 ? "" : "s"}
          </Typography>
          <Stack spacing={1.5}>
            {results.map((repo) => (
              <RepoCard
                key={repo.id}
                fullName={repo.full_name}
                description={repo.description}
                language={repo.language}
                htmlUrl={repo.html_url}
                variant="search"
                isTracked={Boolean(repos[repo.id])}
                onTrack={() => track(repo)}
                onUntrack={() => untrack(repo.id)}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
