import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildDefaultCommands,
  COMMANDS_KEY,
  JIRA_REPO_MAP_KEY,
  loadCommands,
  loadJiraRepoMap,
  saveCommands,
  saveJiraRepo,
  STORAGE_KEY,
  loadBasePath,
  saveBasePath,
  DEFAULT_BASE_PATH,
} from "../src/lib/commands";

type Store = Record<string, unknown>;

function installChromeStorage(initial: Store = {}): Store {
  const store: Store = { ...initial };
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
  };
  return store;
}

describe("buildDefaultCommands", () => {
  it("returns seeds with unique ids per call", () => {
    const a = buildDefaultCommands();
    const b = buildDefaultCommands();
    expect(a).toHaveLength(4);
    expect(new Set(a.map((c) => c.id)).size).toBe(4);
    expect(a[0]?.id).not.toBe(b[0]?.id);
  });

  it("includes a Jira seed", () => {
    const seeds = buildDefaultCommands();
    const jira = seeds.find((c) => c.types.includes("jira"));
    expect(jira).toBeDefined();
  });
});

describe("loadCommands", () => {
  beforeEach(() => {
    installChromeStorage();
  });

  it("seeds defaults on first load and persists them", async () => {
    const store = installChromeStorage();
    const commands = await loadCommands();
    expect(commands).toHaveLength(4);
    expect(store[COMMANDS_KEY]).toEqual(commands);
  });

  it("returns stored commands without re-seeding", async () => {
    const existing = [
      { id: "x", name: "Custom", prompt: "P", types: ["pr" as const] },
    ];
    installChromeStorage({ [COMMANDS_KEY]: existing });
    const commands = await loadCommands();
    expect(commands).toEqual(existing);
  });

  it("returns empty array when user cleared all commands (no re-seed)", async () => {
    installChromeStorage({ [COMMANDS_KEY]: [] });
    const commands = await loadCommands();
    expect(commands).toEqual([]);
  });
});

describe("saveCommands", () => {
  it("writes commands to storage", async () => {
    const store = installChromeStorage();
    const cmds = [
      { id: "1", name: "A", prompt: "p", types: ["issue" as const] },
    ];
    await saveCommands(cmds);
    expect(store[COMMANDS_KEY]).toEqual(cmds);
  });
});

describe("loadBasePath / saveBasePath", () => {
  it("returns default when not set", async () => {
    installChromeStorage();
    expect(await loadBasePath()).toBe(DEFAULT_BASE_PATH);
  });

  it("returns stored path when present", async () => {
    installChromeStorage({ [STORAGE_KEY]: "~/work" });
    expect(await loadBasePath()).toBe("~/work");
  });

  it("falls back to default for empty string", async () => {
    installChromeStorage({ [STORAGE_KEY]: "" });
    expect(await loadBasePath()).toBe(DEFAULT_BASE_PATH);
  });

  it("persists path", async () => {
    const store = installChromeStorage();
    await saveBasePath("~/custom");
    expect(store[STORAGE_KEY]).toBe("~/custom");
  });
});

describe("loadJiraRepoMap / saveJiraRepo", () => {
  it("returns empty object when not set", async () => {
    installChromeStorage();
    expect(await loadJiraRepoMap()).toEqual({});
  });

  it("returns stored map", async () => {
    installChromeStorage({ [JIRA_REPO_MAP_KEY]: { PROJ: "widget" } });
    expect(await loadJiraRepoMap()).toEqual({ PROJ: "widget" });
  });

  it("persists a new mapping", async () => {
    const store = installChromeStorage();
    await saveJiraRepo("PROJ", "widget");
    expect(store[JIRA_REPO_MAP_KEY]).toEqual({ PROJ: "widget" });
  });

  it("updates an existing mapping while preserving others", async () => {
    const store = installChromeStorage({
      [JIRA_REPO_MAP_KEY]: { PROJ: "old", OTHER: "kept" },
    });
    await saveJiraRepo("PROJ", "new");
    expect(store[JIRA_REPO_MAP_KEY]).toEqual({ PROJ: "new", OTHER: "kept" });
  });

  it("trims whitespace before saving", async () => {
    const store = installChromeStorage();
    await saveJiraRepo("PROJ", "  widget  ");
    expect(store[JIRA_REPO_MAP_KEY]).toEqual({ PROJ: "widget" });
  });

  it("removes the entry when value is empty", async () => {
    const store = installChromeStorage({
      [JIRA_REPO_MAP_KEY]: { PROJ: "widget", OTHER: "kept" },
    });
    await saveJiraRepo("PROJ", "   ");
    expect(store[JIRA_REPO_MAP_KEY]).toEqual({ OTHER: "kept" });
  });
});
