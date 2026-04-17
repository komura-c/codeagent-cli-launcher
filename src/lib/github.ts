import { shellEscape, shellEscapePath } from "./shell";
import type { GitHubInfo, GitHubInfoType } from "./types";

export function parseGitHubUrl(url: string): GitHubInfo | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com") return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1];
    if (!owner || !repo) return null;

    const result: GitHubInfo = {
      owner,
      repo,
      type: "repo",
      issueNumber: null,
    };

    if (parts.length === 2) return result;

    const section = parts[2];
    const number = parts[3];

    if (section === "issues" && number) {
      result.type = "issue";
      result.issueNumber = number;
    } else if (section === "pull" && number) {
      result.type = "pr";
      result.issueNumber = number;
    }

    return result;
  } catch {
    return null;
  }
}

export function extractGitHubTitle(
  pageTitle: string,
  type: GitHubInfoType,
): string {
  if (!pageTitle) return "";
  if (type === "issue") {
    return pageTitle
      .replace(/ · Issue #\d+.*$/, "")
      .replace(/ · Pull Request #\d+.*$/, "");
  }
  if (type === "pr") {
    return pageTitle.replace(/ · Pull Request #\d+.*$/, "");
  }
  return "";
}

export function buildPrompt(
  info: GitHubInfo,
  pageTitle: string,
  promptTemplate: string,
): string {
  if (info.type !== "issue" && info.type !== "pr") return "";
  const title = extractGitHubTitle(pageTitle, info.type);
  const label = info.type === "issue" ? "Issue" : "PR";
  const header = `GitHub ${label} #${info.issueNumber}${title ? ": " + title : ""}`;
  return `${header} ${promptTemplate}`;
}

export interface LaunchCommands {
  claude: string;
  codex: string;
}

export function buildCommands(
  info: GitHubInfo,
  basePath: string,
  pageTitle: string,
  promptTemplate: string,
): LaunchCommands {
  const repoPath = `${basePath}/${info.repo}`;
  const prompt = promptTemplate
    ? buildPrompt(info, pageTitle, promptTemplate)
    : "";

  const cdPart = `cd ${shellEscapePath(repoPath)}`;
  const escapedPrompt = prompt ? ` ${shellEscape(prompt)}` : "";

  return {
    claude: `${cdPart} && claude${escapedPrompt}`,
    codex: `${cdPart} && codex${escapedPrompt}`,
  };
}
