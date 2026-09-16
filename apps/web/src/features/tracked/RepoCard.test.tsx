import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RepoCard } from "@repo-radar/ui";

/**
 * Tests what a user can observe — that each status renders the right thing —
 * rather than internals. If these break, the feature genuinely broke.
 */

const base = {
  fullName: "facebook/react",
  description: "A JavaScript library for building user interfaces",
  language: "JavaScript",
  htmlUrl: "https://github.com/facebook/react",
  isTracked: true,
};

describe("RepoCard", () => {
  it("shows stats when loaded", () => {
    render(
      <RepoCard
        {...base}
        stats={{
          status: "success",
          fetchedAt: Date.now(),
          data: {
            stargazers_count: 250_000,
            open_issues_count: 1_372,
            pushed_at: "2026-09-16T10:35:59Z",
            lastCommitDate: "2026-09-16T10:35:58Z",
          },
        }}
      />,
    );

    expect(screen.getByText("250K")).toBeInTheDocument();
    expect(screen.getByText("1.4K")).toBeInTheDocument();
    expect(screen.getByText(/last commit/i)).toBeInTheDocument();
  });

  it("falls back to last push when the commit date is unavailable", () => {
    render(
      <RepoCard
        {...base}
        stats={{
          status: "success",
          fetchedAt: Date.now(),
          data: {
            stargazers_count: 100,
            open_issues_count: 2,
            pushed_at: "2026-09-16T10:35:59Z",
            lastCommitDate: null,
          },
        }}
      />,
    );

    // Labelled honestly as a push rather than silently presented as a commit
    expect(screen.getByText(/last push/i)).toBeInTheDocument();
    expect(screen.queryByText(/last commit/i)).not.toBeInTheDocument();
  });

  it("surfaces an error without losing the repo", () => {
    render(
      <RepoCard {...base} stats={{ status: "error", message: "Rate limited" }} />,
    );

    expect(screen.getByText(/couldn't refresh/i)).toBeInTheDocument();
    // The repo itself is still listed — a failed refresh is not a removed repo
    expect(screen.getByText("facebook/react")).toBeInTheDocument();
  });

  it("disables refresh while loading", async () => {
    render(
      <RepoCard {...base} stats={{ status: "loading" }} onRefresh={vi.fn()} />,
    );

    expect(
      screen.getByRole("button", { name: /refresh facebook\/react/i }),
    ).toBeDisabled();
  });

  it("calls onTrack when an untracked repo is tracked", async () => {
    const onTrack = vi.fn();
    render(<RepoCard {...base} isTracked={false} onTrack={onTrack} />);

    await userEvent.click(
      screen.getByRole("button", { name: /track facebook\/react/i }),
    );

    expect(onTrack).toHaveBeenCalledOnce();
  });
});
