import type { Command, CommandType } from "./types";

export interface Frontmatter {
  meta: Record<string, string | string[]>;
  body: string;
}

export function parseFrontmatter(text: string): Frontmatter | null {
  const match = text
    .replace(/^\uFEFF/, "")
    .trim()
    .match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  const metaRaw = match[1] ?? "";
  const bodyRaw = match[2] ?? "";
  const meta: Record<string, string | string[]> = {};
  let currentKey: string | null = null;

  metaRaw.split("\n").forEach((line) => {
    const colonIdx = line.indexOf(":");
    if (!line.startsWith(" ") && colonIdx !== -1) {
      currentKey = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim();
      meta[currentKey] = val === "" ? [] : val;
    } else if (line.trim().startsWith("- ") && currentKey) {
      if (!Array.isArray(meta[currentKey])) meta[currentKey] = [];
      (meta[currentKey] as string[]).push(line.trim().slice(2));
    }
  });

  return { meta, body: bodyRaw.trim() };
}

export const COMMAND_SEPARATOR = "\n\n<!-- @@command @@ -->\n\n";

export function commandToMarkdown(cmd: Command): string {
  const typesYaml = cmd.types.map((t) => `  - ${t}`).join("\n");
  return `---\nname: ${cmd.name}\ntypes:\n${typesYaml}\n---\n${cmd.prompt}`;
}

export function commandsToMarkdown(commands: Command[]): string {
  return commands.map(commandToMarkdown).join(COMMAND_SEPARATOR);
}

// Splits on an HTML-comment sentinel, with a legacy fallback for files
// exported before the sentinel existed (2+ blank lines followed by "---\n").
export function parseMultiCommandMarkdown(text: string): Command[] {
  const commands: Command[] = [];
  const rawBlocks = text.includes(COMMAND_SEPARATOR.trim())
    ? text.split(/\n*<!--\s*@@command @@\s*-->\n*/)
    : text.split(/\n{2,}(?=---\n)/);
  const blocks = rawBlocks.filter((b) => b.trim());

  for (const block of blocks) {
    const parsed = parseFrontmatter(block.trim());
    if (!parsed) continue;

    const nameValue = parsed.meta["name"];
    const typesValue = parsed.meta["types"];
    if (!nameValue || !typesValue) continue;

    const name = Array.isArray(nameValue) ? nameValue[0] : nameValue;
    if (!name) continue;

    const rawTypes = Array.isArray(typesValue) ? typesValue : [typesValue];
    const types = rawTypes.filter(
      (t): t is CommandType => t === "issue" || t === "pr",
    );
    if (types.length === 0) continue;

    commands.push({
      id: crypto.randomUUID(),
      name,
      prompt: parsed.body,
      types,
    });
  }

  return commands;
}
