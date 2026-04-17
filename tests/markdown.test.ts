import { describe, it, expect } from "vitest";
import {
  commandsToMarkdown,
  commandToMarkdown,
  parseFrontmatter,
  parseMultiCommandMarkdown,
} from "../src/lib/markdown";
import type { Command } from "../src/lib/types";

describe("parseFrontmatter", () => {
  it("parses valid frontmatter with array types", () => {
    const text = "---\nname: Test\ntypes:\n  - pr\n  - issue\n---\nHello world";
    const result = parseFrontmatter(text);
    expect(result).toEqual({
      meta: { name: "Test", types: ["pr", "issue"] },
      body: "Hello world",
    });
  });

  it("parses scalar value", () => {
    const text = "---\nid: default-1\nname: Test\ntypes:\n  - pr\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result?.meta["id"]).toBe("default-1");
    expect(result?.meta["name"]).toBe("Test");
    expect(result?.meta["types"]).toEqual(["pr"]);
  });

  it("strips BOM", () => {
    const text = "\uFEFF---\nname: Test\ntypes:\n  - pr\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result).not.toBeNull();
    expect(result?.meta["name"]).toBe("Test");
  });

  it("strips leading whitespace", () => {
    const text = "  \n---\nname: Test\ntypes:\n  - pr\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result).not.toBeNull();
    expect(result?.meta["name"]).toBe("Test");
  });

  it("returns null for invalid input", () => {
    expect(parseFrontmatter("no frontmatter here")).toBeNull();
    expect(parseFrontmatter("")).toBeNull();
  });

  it("parses frontmatter without trailing newline after closing ---", () => {
    const result = parseFrontmatter("---\nname: Test\n---");
    expect(result).not.toBeNull();
    expect(result?.meta["name"]).toBe("Test");
    expect(result?.body).toBe("");
  });

  it("trims body whitespace", () => {
    const text =
      "---\nname: Test\ntypes:\n  - pr\n---\n  body with spaces  \n";
    const result = parseFrontmatter(text);
    expect(result?.body).toBe("body with spaces");
  });

  it("handles empty body", () => {
    const text = "---\nname: Test\ntypes:\n  - pr\n---\n";
    const result = parseFrontmatter(text);
    expect(result?.body).toBe("");
  });

  it("handles empty array key", () => {
    const text = "---\nname: Test\ntypes:\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result?.meta["types"]).toEqual([]);
  });

  it("ignores list item line when no current key", () => {
    const text = "---\n  - orphan\nname: Test\ntypes:\n  - pr\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result?.meta["name"]).toBe("Test");
    expect(result?.meta["types"]).toEqual(["pr"]);
  });

  it("ignores line without colon and not a list item", () => {
    const text = "---\nname: Test\njust a line\ntypes:\n  - pr\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result?.meta["name"]).toBe("Test");
    expect(result?.meta["types"]).toEqual(["pr"]);
  });

  it("converts non-array to array when list item follows", () => {
    const text = "---\ntypes: existing\n  - pr\n---\nbody";
    const result = parseFrontmatter(text);
    expect(result?.meta["types"]).toEqual(["pr"]);
  });
});

describe("commandToMarkdown", () => {
  it("converts command with single type", () => {
    const cmd: Command = {
      id: "x",
      name: "Test",
      types: ["pr"],
      prompt: "Do something",
    };
    expect(commandToMarkdown(cmd)).toBe(
      "---\nname: Test\ntypes:\n  - pr\n---\nDo something",
    );
  });

  it("converts command with multiple types", () => {
    const cmd: Command = {
      id: "x",
      name: "Test",
      types: ["pr", "issue"],
      prompt: "Do it",
    };
    expect(commandToMarkdown(cmd)).toBe(
      "---\nname: Test\ntypes:\n  - pr\n  - issue\n---\nDo it",
    );
  });
});

describe("parseMultiCommandMarkdown", () => {
  it("parses single command", () => {
    const text = "---\nname: Cmd1\ntypes:\n  - pr\n---\nPrompt1";
    const result = parseMultiCommandMarkdown(text);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Cmd1");
    expect(result[0]?.prompt).toBe("Prompt1");
    expect(result[0]?.types).toEqual(["pr"]);
    expect(result[0]?.id).toBeDefined();
    expect(result[0]).not.toHaveProperty("isDefault");
  });

  it("parses multiple commands separated by blank lines", () => {
    const text =
      "---\nname: A\ntypes:\n  - pr\n---\nPrompt A\n\n\n---\nname: B\ntypes:\n  - issue\n---\nPrompt B";
    const result = parseMultiCommandMarkdown(text);
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe("A");
    expect(result[1]?.name).toBe("B");
  });

  it("returns empty array for invalid input", () => {
    expect(parseMultiCommandMarkdown("")).toEqual([]);
    expect(parseMultiCommandMarkdown("no frontmatter")).toEqual([]);
  });

  it("skips blocks missing name or types", () => {
    const text =
      "---\nname: Valid\ntypes:\n  - pr\n---\nOK\n\n\n---\nfoo: bar\n---\nBad";
    const result = parseMultiCommandMarkdown(text);
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("Valid");
  });

  it("converts scalar types to array", () => {
    const text = "---\nname: Test\ntypes: pr\n---\nPrompt";
    const result = parseMultiCommandMarkdown(text);
    expect(result).toHaveLength(1);
    expect(result[0]?.types).toEqual(["pr"]);
  });

  it("skips unknown types", () => {
    const text = "---\nname: Test\ntypes:\n  - pr\n  - bogus\n---\nPrompt";
    const result = parseMultiCommandMarkdown(text);
    expect(result).toHaveLength(1);
    expect(result[0]?.types).toEqual(["pr"]);
  });

  it("skips blocks where all types are unknown", () => {
    const text = "---\nname: Test\ntypes:\n  - bogus\n---\nPrompt";
    const result = parseMultiCommandMarkdown(text);
    expect(result).toHaveLength(0);
  });

  it("generates unique ids for each command", () => {
    const text =
      "---\nname: A\ntypes:\n  - pr\n---\nP1\n\n\n---\nname: B\ntypes:\n  - pr\n---\nP2";
    const result = parseMultiCommandMarkdown(text);
    expect(result[0]?.id).not.toBe(result[1]?.id);
  });

  it("round-trips multiple commands through commandsToMarkdown", () => {
    const originals: Command[] = [
      { id: "a", name: "A", types: ["pr"], prompt: "PA\n\n---\nlooks like yaml" },
      { id: "b", name: "B", types: ["issue"], prompt: "PB" },
    ];
    const md = commandsToMarkdown(originals);
    const parsed = parseMultiCommandMarkdown(md);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.name).toBe("A");
    expect(parsed[0]?.prompt).toBe("PA\n\n---\nlooks like yaml");
    expect(parsed[1]?.name).toBe("B");
  });

  it("round-trips through commandToMarkdown and parseMultiCommandMarkdown", () => {
    const original: Command = {
      id: "x",
      name: "Round Trip",
      types: ["pr", "issue"],
      prompt: "Line1\n\nLine2",
    };
    const md = commandToMarkdown(original);
    const parsed = parseMultiCommandMarkdown(md);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.name).toBe(original.name);
    expect(parsed[0]?.types).toEqual(original.types);
    expect(parsed[0]?.prompt).toBe(original.prompt);
  });
});
