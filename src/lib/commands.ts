import type { Command } from "./types";

export const STORAGE_KEY = "codeagent_cli_launcher_base_path";
export const COMMANDS_KEY = "codeagent_cli_launcher_commands";
export const DEFAULT_BASE_PATH = "~/repos";

type DefaultCommandSeed = Omit<Command, "id">;

const DEFAULT_COMMAND_SEEDS: DefaultCommandSeed[] = [
  {
    name: "PRレビュー",
    prompt: "PRの内容を確認して、レビューしてください。",
    types: ["pr"],
  },
  {
    name: "レビューコメント修正",
    prompt: "PRのレビューコメントを確認して、レビュー内容を修正してください。",
    types: ["pr"],
  },
  {
    name: "Issue対応",
    prompt: "Issueの内容を確認して、対応してください。",
    types: ["issue"],
  },
];

export function buildDefaultCommands(): Command[] {
  return DEFAULT_COMMAND_SEEDS.map((seed) => ({
    id: crypto.randomUUID(),
    ...seed,
  }));
}

// An empty array means "user cleared all commands" — do not re-seed.
export async function loadCommands(): Promise<Command[]> {
  const stored = await chrome.storage.local.get(COMMANDS_KEY);
  const existing = stored[COMMANDS_KEY] as Command[] | undefined;
  if (existing !== undefined) return existing;
  const seeded = buildDefaultCommands();
  await saveCommands(seeded);
  return seeded;
}

export async function saveCommands(commands: Command[]): Promise<void> {
  await chrome.storage.local.set({ [COMMANDS_KEY]: commands });
}

export async function loadBasePath(): Promise<string> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const value = stored[STORAGE_KEY] as string | undefined;
  return value || DEFAULT_BASE_PATH;
}

export async function saveBasePath(basePath: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: basePath });
}
