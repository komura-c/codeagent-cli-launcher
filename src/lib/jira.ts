import { shellEscape, shellEscapePath } from "./shell";
import type { JiraInfo, LaunchCommands } from "./types";

const TICKET_ID_RE = /^([A-Z][A-Z0-9_]+)-(\d+)$/;

export function parseJiraUrl(url: string): JiraInfo | null {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const labels = host.split(".");
    if (
      labels.length !== 3 ||
      labels[1] !== "atlassian" ||
      labels[2] !== "net"
    ) {
      return null;
    }
    const tenant = labels[0];
    if (!tenant) return null;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "browse") return null;

    const ticketId = parts[1] ?? "";
    const m = ticketId.match(TICKET_ID_RE);
    if (!m) return null;

    const projectKey = m[1];
    const ticketNumber = m[2];
    if (!projectKey || !ticketNumber) return null;

    return { tenant, projectKey, ticketNumber };
  } catch {
    return null;
  }
}

export function extractJiraTitle(
  pageTitle: string,
  projectKey: string,
  ticketNumber: string,
): string {
  if (!pageTitle) return "";
  const prefix = new RegExp(`^\\[${projectKey}-${ticketNumber}\\]\\s*`);
  return pageTitle.replace(prefix, "").replace(/\s*-\s*Jira$/, "");
}

export function buildJiraPrompt(
  info: JiraInfo,
  pageTitle: string,
  promptTemplate: string,
): string {
  const title = extractJiraTitle(pageTitle, info.projectKey, info.ticketNumber);
  const header = `Jira ${info.projectKey}-${info.ticketNumber}${title ? ": " + title : ""}`;
  return `${header} ${promptTemplate}`;
}

export function buildJiraCommands(
  info: JiraInfo,
  basePath: string,
  repoName: string,
  pageTitle: string,
  promptTemplate: string,
): LaunchCommands {
  const repoPath = `${basePath}/${repoName}`;
  const prompt = promptTemplate
    ? buildJiraPrompt(info, pageTitle, promptTemplate)
    : "";

  const cdPart = `cd ${shellEscapePath(repoPath)}`;
  const escapedPrompt = prompt ? ` ${shellEscape(prompt)}` : "";

  return {
    claude: `${cdPart} && claude${escapedPrompt}`,
    codex: `${cdPart} && codex${escapedPrompt}`,
  };
}
