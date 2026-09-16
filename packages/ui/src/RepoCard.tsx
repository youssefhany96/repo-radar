import {
  Card, CardContent, Stack, Typography, Box, IconButton,
  Skeleton, Link, Tooltip,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import BugIcon from "@mui/icons-material/BugReport";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/AddCircle";
import type { RepoStatsStatus } from "@repo-radar/types";
import { StatChip } from "./StatChip";

interface RepoCardProps {
  fullName: string;
  description: string | null;
  language: string | null;
  htmlUrl: string;
  /** Omitted in search results, present for tracked repos. */
  stats?: RepoStatsStatus;
  isTracked: boolean;
  onTrack?: () => void;
  onUntrack?: () => void;
  onRefresh?: () => void;
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(months / 12)}y ago`;
}

/**
 * Presentational. Receives everything it renders and reports interactions
 * upward — no store access, no data fetching. That's what makes it belong in a
 * shared package rather than in the app.
 */
export function RepoCard({
  fullName, description, language, htmlUrl,
  stats, isTracked, onTrack, onUntrack, onRefresh,
}: RepoCardProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: "flex-start" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Link
              href={htmlUrl} target="_blank" rel="noopener noreferrer"
              underline="hover" variant="subtitle1" sx={{ fontWeight: 600 }}
            >
              {fullName}
            </Link>

            <Typography
              variant="body2" color="text.secondary"
              sx={{ mt: 0.5, display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {description ?? "No description"}
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.5, flexWrap: "wrap" }}>
              {language && (
                <StatChip
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main", ml: 1 }} />}
                  label={language}
                  tooltip="Primary language"
                />
              )}

              {/* Each card renders its OWN status — this is why stats live in a
                  keyed map rather than on one shared loading flag. */}
              {stats?.status === "loading" && (
                <>
                  <Skeleton variant="rounded" width={72} height={24} />
                  <Skeleton variant="rounded" width={72} height={24} />
                </>
              )}

              {stats?.status === "error" && (
                <Tooltip title={stats.message}>
                  <Typography variant="caption" color="error">
                    Couldn&apos;t refresh
                  </Typography>
                </Tooltip>
              )}

              {stats?.status === "success" && (
                <>
                  <StatChip
                    icon={<StarIcon fontSize="small" />}
                    label={fmt.format(stats.data.stargazers_count)}
                    tooltip="Stars"
                  />
                  <StatChip
                    icon={<BugIcon fontSize="small" />}
                    label={fmt.format(stats.data.open_issues_count)}
                    tooltip="Open issues"
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
                    updated {relativeTime(stats.data.pushed_at)}
                  </Typography>
                </>
              )}
            </Stack>
          </Box>

          <Stack direction="row" spacing={0.5}>
            {onRefresh && (
              <Tooltip title="Refresh">
                <span>
                  <IconButton
                    size="small" onClick={onRefresh}
                    disabled={stats?.status === "loading"}
                    aria-label={`Refresh ${fullName}`}
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            )}
            {isTracked ? (
              <Tooltip title="Untrack">
                <IconButton size="small" onClick={onUntrack} aria-label={`Untrack ${fullName}`}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Track">
                <IconButton size="small" onClick={onTrack} color="primary" aria-label={`Track ${fullName}`}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
