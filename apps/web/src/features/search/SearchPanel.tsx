import { useEffect } from "react";
import { Stack, Typography, CircularProgress, Box } from "@mui/material";
import { RepoCard, SearchField, EmptyState, ErrorState } from "@repo-radar/ui";
import { useAppDispatch, useAppSelector } from "../../store";
import { setQuery, search } from "../../store/searchSlice";
import { track, untrack } from "../../store/trackedSlice";
import { useDebounced } from "../../hooks/useDebounced";

export function SearchPanel() {
  const dispatch = useAppDispatch();
  const { query, results, status, error } = useAppSelector((s) => s.search);
  const trackedIds = useAppSelector((s) => s.tracked.repos);
  const debouncedQuery = useDebounced(query, 400);

  useEffect(() => {
    const promise = dispatch(search(debouncedQuery));
    // Aborts the in-flight request when the query changes — an older search
    // can't resolve after a newer one and overwrite the results.
    return () => promise.abort();
  }, [debouncedQuery, dispatch]);

  return (
    <Stack spacing={2}>
      <SearchField
        value={query}
        onChange={(v) => dispatch(setQuery(v))}
        loading={status === "loading"}
        placeholder="Search GitHub repositories…"
      />

      {status === "error" && error && (
        <ErrorState message={error} onRetry={() => dispatch(search(debouncedQuery))} />
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
                isTracked={Boolean(trackedIds[repo.id])}
                onTrack={() => dispatch(track(repo))}
                onUntrack={() => dispatch(untrack(repo.id))}
              />
            ))}
          </Stack>
        </>
      )}
    </Stack>
  );
}
