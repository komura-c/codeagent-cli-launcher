import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMANDS_KEY,
  JIRA_REPO_MAP_KEY,
  STORAGE_KEY,
} from "../src/lib/commands";

type Store = Record<string, unknown>;

interface ChromeTab {
  url?: string;
  title?: string;
}

function installChrome(storeInit: Store, tab: ChromeTab): Store {
  const store: Store = { ...storeInit };
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: {
        get: vi.fn(async (key: string) =>
          key in store ? { [key]: store[key] } : {},
        ),
        set: vi.fn(async (obj: Store) => {
          Object.assign(store, obj);
        }),
      },
    },
    tabs: {
      query: vi.fn(async () => [tab]),
    },
  };
  return store;
}

function installClipboard(): { writeText: ReturnType<typeof vi.fn> } {
  const writeText = vi.fn(async () => undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  return { writeText };
}

function loadPopupHtml(): void {
  const html = readFileSync(
    resolve(__dirname, "../src/popup/index.html"),
    "utf8",
  );
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
  const bodyInner = (bodyMatch?.[1] ?? "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]*>/g, "");
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  const tpl = document.createElement("template");
  tpl.innerHTML = bodyInner;
  document.body.appendChild(tpl.content);
}

async function runPopupInit(): Promise<void> {
  vi.resetModules();
  await import("../src/popup/popup");
  // Allow microtasks (chrome.tabs.query, loadBasePath, loadCommands) to settle.
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe("popup integration", () => {
  beforeEach(() => {
    loadPopupHtml();
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("shows not-supported message for non-GitHub non-Jira URLs", async () => {
    installChrome({}, { url: "https://example.com", title: "x" });
    await runPopupInit();

    const notSupported = document.getElementById("not-supported")!;
    const pageContent = document.getElementById("page-content")!;
    expect(notSupported.classList.contains("hidden")).toBe(false);
    expect(pageContent.classList.contains("hidden")).toBe(true);
  });

  it("renders repo-level claude/codex commands using stored base path", async () => {
    installChrome(
      { [STORAGE_KEY]: "~/work" },
      { url: "https://github.com/acme/widget", title: "acme/widget" },
    );
    await runPopupInit();

    expect(document.getElementById("repo-name")!.textContent).toBe(
      "acme/widget",
    );
    expect(document.getElementById("claude-cmd")!.textContent).toBe(
      "cd ~/work/widget && claude",
    );
    expect(document.getElementById("codex-cmd")!.textContent).toBe(
      "cd ~/work/widget && codex",
    );
    expect(
      document.getElementById("issue-section")!.classList.contains("hidden"),
    ).toBe(true);
  });

  it("renders PR commands with selected prompt template", async () => {
    installChrome(
      { [STORAGE_KEY]: "~/repos" },
      {
        url: "https://github.com/acme/widget/pull/42",
        title: "Fix bug · Pull Request #42 · acme/widget",
      },
    );
    await runPopupInit();

    const claude = document.getElementById("claude-cmd")!.textContent ?? "";
    expect(claude).toContain("cd ~/repos/widget && claude");
    expect(claude).toContain("GitHub PR #42: Fix bug");
    expect(claude).toContain("レビューしてください");
  });

  it("copies the claude command to clipboard and shows feedback", async () => {
    const { writeText } = installClipboard();
    installChrome({}, { url: "https://github.com/acme/widget", title: "" });
    await runPopupInit();

    const btn = document.querySelector<HTMLButtonElement>(
      '.copy-btn[data-target="claude-cmd"]',
    )!;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(writeText).toHaveBeenCalledWith("cd ~/repos/widget && claude");
    expect(
      document.getElementById("copy-feedback")!.classList.contains("hidden"),
    ).toBe(false);
  });

  it("renders Jira ticket info and commands when repo name is stored", async () => {
    installChrome(
      {
        [STORAGE_KEY]: "~/repos",
        [JIRA_REPO_MAP_KEY]: { PROJ: "myrepo" },
      },
      {
        url: "https://acme.atlassian.net/browse/PROJ-7",
        title: "[PROJ-7] Add login - Jira",
      },
    );
    await runPopupInit();

    expect(
      document.getElementById("jira-section")!.classList.contains("hidden"),
    ).toBe(false);
    expect(
      document.getElementById("github-section")!.classList.contains("hidden"),
    ).toBe(true);
    expect(document.getElementById("jira-ticket-info")!.textContent).toBe(
      "PROJ-7 - Add login",
    );
    expect(
      (document.getElementById("jira-repo-name") as HTMLInputElement).value,
    ).toBe("myrepo");

    const claude = document.getElementById("claude-cmd")!.textContent ?? "";
    expect(claude).toContain("cd ~/repos/myrepo && claude");
    expect(claude).toContain("Jira PROJ-7: Add login");
  });

  it("disables copy buttons and shows placeholder when Jira repo name is empty", async () => {
    installChrome(
      {},
      {
        url: "https://acme.atlassian.net/browse/PROJ-7",
        title: "[PROJ-7] Foo - Jira",
      },
    );
    await runPopupInit();

    expect(document.getElementById("claude-cmd")!.textContent).toBe(
      "リポジトリ名を入力してください",
    );
    const copyBtns = document.querySelectorAll<HTMLButtonElement>(".copy-btn");
    copyBtns.forEach((btn) => expect(btn.disabled).toBe(true));
  });

  it("persists Jira repo name to per-project map on blur", async () => {
    const store = installChrome(
      {},
      {
        url: "https://acme.atlassian.net/browse/PROJ-7",
        title: "[PROJ-7] Foo - Jira",
      },
    );
    await runPopupInit();

    const input = document.getElementById("jira-repo-name") as HTMLInputElement;
    input.value = "widget";
    input.dispatchEvent(new Event("input"));
    input.dispatchEvent(new Event("blur"));
    await new Promise((r) => setTimeout(r, 0));

    expect(store[JIRA_REPO_MAP_KEY]).toEqual({ PROJ: "widget" });
    expect(document.getElementById("claude-cmd")!.textContent).toContain(
      "cd ~/repos/widget && claude",
    );
  });

  it("filters command select by jira type on Jira pages", async () => {
    installChrome(
      {
        [COMMANDS_KEY]: [
          { id: "1", name: "ForJira", prompt: "P1", types: ["jira"] },
          { id: "2", name: "ForPR", prompt: "P2", types: ["pr"] },
        ],
        [JIRA_REPO_MAP_KEY]: { PROJ: "r" },
      },
      {
        url: "https://acme.atlassian.net/browse/PROJ-1",
        title: "[PROJ-1] T - Jira",
      },
    );
    await runPopupInit();

    const select = document.getElementById(
      "command-select",
    ) as HTMLSelectElement;
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toEqual(["ForJira"]);
  });

  it("adds a new command via the settings form and persists it", async () => {
    const store = installChrome(
      { [COMMANDS_KEY]: [] },
      {
        url: "https://github.com/acme/widget/issues/7",
        title: "Bug · Issue #7 · acme/widget",
      },
    );
    await runPopupInit();

    document
      .getElementById("settings-toggle")!
      .dispatchEvent(new Event("click"));

    (document.getElementById("add-name") as HTMLInputElement).value = "MyCmd";
    (document.getElementById("add-prompt") as HTMLTextAreaElement).value =
      "do stuff";
    const issueCb = document.querySelector<HTMLInputElement>(
      "#add-types input[value=issue]",
    )!;
    issueCb.checked = true;

    document.getElementById("add-submit")!.dispatchEvent(new Event("click"));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    const saved = store[COMMANDS_KEY] as Array<{ name: string }>;
    expect(saved).toHaveLength(1);
    expect(saved[0]?.name).toBe("MyCmd");

    const list = document.getElementById("command-list")!;
    expect(list.textContent).toContain("MyCmd");
  });
});
