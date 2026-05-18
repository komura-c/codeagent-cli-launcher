import { describe, it, expect } from "vitest";
import {
  buildJiraCommands,
  buildJiraPrompt,
  extractJiraTitle,
  parseJiraUrl,
} from "../src/lib/jira";
import type { JiraInfo } from "../src/lib/types";

describe("parseJiraUrl", () => {
  it("parses an Atlassian Cloud ticket URL", () => {
    expect(
      parseJiraUrl("https://acme.atlassian.net/browse/PROJ-123"),
    ).toEqual({ tenant: "acme", projectKey: "PROJ", ticketNumber: "123" });
  });

  it("parses URL with query string", () => {
    expect(
      parseJiraUrl(
        "https://acme.atlassian.net/browse/PROJ-1?atlOrigin=foo",
      ),
    ).toEqual({ tenant: "acme", projectKey: "PROJ", ticketNumber: "1" });
  });

  it("returns null for GitHub URL", () => {
    expect(parseJiraUrl("https://github.com/owner/repo")).toBeNull();
  });

  it("returns null when ticket id is missing", () => {
    expect(parseJiraUrl("https://acme.atlassian.net/browse")).toBeNull();
  });

  it("returns null for lowercase project key", () => {
    expect(
      parseJiraUrl("https://acme.atlassian.net/browse/proj-1"),
    ).toBeNull();
  });

  it("returns null for a 1-char project key", () => {
    expect(
      parseJiraUrl("https://acme.atlassian.net/browse/A-1"),
    ).toBeNull();
  });

  it("returns null for non-/browse path", () => {
    expect(
      parseJiraUrl("https://acme.atlassian.net/jira/your-work"),
    ).toBeNull();
  });

  it("returns null when tenant subdomain is missing", () => {
    expect(parseJiraUrl("https://atlassian.net/browse/PROJ-1")).toBeNull();
  });

  it("returns null for suffix-match attack domain", () => {
    expect(
      parseJiraUrl("https://acme.evil-atlassian.net/browse/PROJ-1"),
    ).toBeNull();
  });

  it("returns null for invalid URL", () => {
    expect(parseJiraUrl("not-a-url")).toBeNull();
  });
});

describe("extractJiraTitle", () => {
  it("strips bracketed prefix and Jira suffix", () => {
    expect(extractJiraTitle("[PROJ-1] Fix login - Jira", "PROJ", "1")).toBe(
      "Fix login",
    );
  });

  it("strips only the prefix when suffix is absent", () => {
    expect(extractJiraTitle("[PROJ-1] No suffix", "PROJ", "1")).toBe(
      "No suffix",
    );
  });

  it("returns empty string for empty input", () => {
    expect(extractJiraTitle("", "PROJ", "1")).toBe("");
  });

  it("does not strip prefix when the key/number does not match", () => {
    expect(extractJiraTitle("[OTHER-2] Different - Jira", "PROJ", "1")).toBe(
      "[OTHER-2] Different",
    );
  });

  it("handles project keys with digits/underscores", () => {
    expect(
      extractJiraTitle("[PROJ_2-9] Build - Jira", "PROJ_2", "9"),
    ).toBe("Build");
  });
});

describe("buildJiraPrompt", () => {
  const info: JiraInfo = {
    tenant: "acme",
    projectKey: "PROJ",
    ticketNumber: "1",
  };

  it("builds prompt with title", () => {
    expect(
      buildJiraPrompt(info, "[PROJ-1] Fix login - Jira", "Do the work"),
    ).toBe("Jira PROJ-1: Fix login Do the work");
  });

  it("builds prompt without title", () => {
    expect(buildJiraPrompt(info, "", "Do the work")).toBe(
      "Jira PROJ-1 Do the work",
    );
  });
});

describe("buildJiraCommands", () => {
  const info: JiraInfo = {
    tenant: "acme",
    projectKey: "PROJ",
    ticketNumber: "1",
  };

  it("builds commands with prompt", () => {
    const result = buildJiraCommands(
      info,
      "~/repos",
      "widget",
      "[PROJ-1] Fix login - Jira",
      "Fix it",
    );
    expect(result.claude).toContain("cd ~/repos/widget");
    expect(result.claude).toContain("&& claude '");
    expect(result.claude).toContain("Jira PROJ-1: Fix login Fix it");
    expect(result.codex).toContain("&& codex '");
  });

  it("builds commands without prompt", () => {
    const result = buildJiraCommands(info, "~/repos", "widget", "", "");
    expect(result.claude).toBe("cd ~/repos/widget && claude");
    expect(result.codex).toBe("cd ~/repos/widget && codex");
  });

  it("escapes repo name with spaces", () => {
    const result = buildJiraCommands(info, "~/repos", "my repo", "", "");
    expect(result.claude).toBe("cd ~/'repos/my repo' && claude");
  });

  it("escapes repo name with single quotes", () => {
    const result = buildJiraCommands(info, "~/repos", "it's", "", "");
    expect(result.claude).toContain("~/'repos/it'\\''s'");
  });
});
