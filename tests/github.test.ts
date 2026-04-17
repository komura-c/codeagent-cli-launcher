import { describe, it, expect } from "vitest";
import {
  buildCommands,
  buildPrompt,
  parseGitHubUrl,
} from "../src/lib/github";
import type { GitHubInfo } from "../src/lib/types";

describe("parseGitHubUrl", () => {
  it("parses repo URL", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
      type: "repo",
      issueNumber: null,
    });
  });

  it("parses issue URL", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/issues/42")).toEqual({
      owner: "owner",
      repo: "repo",
      type: "issue",
      issueNumber: "42",
    });
  });

  it("parses PR URL", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/pull/7")).toEqual({
      owner: "owner",
      repo: "repo",
      type: "pr",
      issueNumber: "7",
    });
  });

  it("returns null for non-GitHub URL", () => {
    expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(parseGitHubUrl("not-a-url")).toBeNull();
  });

  it("returns null for too short path", () => {
    expect(parseGitHubUrl("https://github.com/owner")).toBeNull();
  });

  it("returns repo type for unknown section", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/wiki");
    expect(result?.type).toBe("repo");
  });

  it("returns repo type for issues without number", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/issues");
    expect(result?.type).toBe("repo");
  });

  it("returns repo type for pull without number", () => {
    const result = parseGitHubUrl("https://github.com/owner/repo/pull");
    expect(result?.type).toBe("repo");
  });
});

describe("buildPrompt", () => {
  const issueInfo: GitHubInfo = {
    owner: "o",
    repo: "r",
    type: "issue",
    issueNumber: "5",
  };
  const prInfo: GitHubInfo = {
    owner: "o",
    repo: "r",
    type: "pr",
    issueNumber: "10",
  };
  const repoInfo: GitHubInfo = {
    owner: "o",
    repo: "r",
    type: "repo",
    issueNumber: null,
  };

  it("builds issue prompt with title", () => {
    const result = buildPrompt(
      { ...issueInfo, issueNumber: "5" },
      "Bug report · Issue #5 · owner/repo",
      "Fix it",
    );
    expect(result).toBe("GitHub Issue #5: Bug report Fix it");
  });

  it("builds PR prompt with title", () => {
    const result = buildPrompt(
      { ...prInfo, issueNumber: "10" },
      "Feature · Pull Request #10 · owner/repo",
      "Review",
    );
    expect(result).toBe("GitHub PR #10: Feature Review");
  });

  it("builds issue prompt without matching title suffix", () => {
    const result = buildPrompt(
      { ...issueInfo, issueNumber: "1" },
      "Simple title",
      "Do it",
    );
    expect(result).toBe("GitHub Issue #1: Simple title Do it");
  });

  it("builds PR prompt without matching title suffix", () => {
    const result = buildPrompt(
      { ...prInfo, issueNumber: "1" },
      "Simple title",
      "Do it",
    );
    expect(result).toBe("GitHub PR #1: Simple title Do it");
  });

  it("builds issue prompt with empty pageTitle", () => {
    const result = buildPrompt({ ...issueInfo, issueNumber: "1" }, "", "Fix");
    expect(result).toBe("GitHub Issue #1 Fix");
  });

  it("builds PR prompt with empty pageTitle", () => {
    const result = buildPrompt({ ...prInfo, issueNumber: "1" }, "", "Review");
    expect(result).toBe("GitHub PR #1 Review");
  });

  it("returns empty string for repo type", () => {
    expect(buildPrompt(repoInfo, "title", "template")).toBe("");
  });
});

describe("buildCommands", () => {
  it("builds commands with prompt", () => {
    const info: GitHubInfo = {
      owner: "o",
      repo: "my-repo",
      type: "issue",
      issueNumber: "1",
    };
    const result = buildCommands(info, "~/repos", "Title · Issue #1 · o/r", "Fix");
    expect(result.claude).toContain("cd ~/repos/my-repo");
    expect(result.claude).toContain("&& claude '");
    expect(result.codex).toContain("&& codex '");
  });

  it("builds commands without prompt for repo type", () => {
    const info: GitHubInfo = {
      owner: "o",
      repo: "my-repo",
      type: "repo",
      issueNumber: null,
    };
    const result = buildCommands(info, "~/repos", "", "");
    expect(result.claude).toBe("cd ~/repos/my-repo && claude");
    expect(result.codex).toBe("cd ~/repos/my-repo && codex");
  });

  it("escapes path with spaces", () => {
    const info: GitHubInfo = {
      owner: "o",
      repo: "my repo",
      type: "repo",
      issueNumber: null,
    };
    const result = buildCommands(info, "~/my repos", "", "");
    expect(result.claude).toBe("cd ~/'my repos/my repo' && claude");
  });

  it("escapes path with single quotes", () => {
    const info: GitHubInfo = {
      owner: "o",
      repo: "it's",
      type: "repo",
      issueNumber: null,
    };
    const result = buildCommands(info, "~/repos", "", "");
    expect(result.claude).toContain("~/'repos/it'\\''s'");
  });
});
