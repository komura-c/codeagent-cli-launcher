import { describe, it, expect } from "vitest";
import { shellEscape, shellEscapePath } from "../src/lib/shell";

describe("shellEscape", () => {
  it("wraps string in single quotes", () => {
    expect(shellEscape("hello")).toBe("'hello'");
  });

  it("escapes single quotes", () => {
    expect(shellEscape("it's")).toBe("'it'\\''s'");
  });

  it("handles empty string", () => {
    expect(shellEscape("")).toBe("''");
  });

  it("handles special shell characters", () => {
    expect(shellEscape('$HOME `cmd` "quoted"')).toBe(
      "'$HOME `cmd` \"quoted\"'",
    );
  });

  it("handles multiple single quotes", () => {
    expect(shellEscape("a'b'c")).toBe("'a'\\''b'\\''c'");
  });
});

describe("shellEscapePath", () => {
  it("returns unquoted path when all chars are safe", () => {
    expect(shellEscapePath("~/repos/my-repo")).toBe("~/repos/my-repo");
  });

  it("returns unquoted absolute path when safe", () => {
    expect(shellEscapePath("/absolute/path")).toBe("/absolute/path");
  });

  it("returns unquoted relative path when safe", () => {
    expect(shellEscapePath("relative/path")).toBe("relative/path");
  });

  it("returns unquoted bare tilde when safe", () => {
    expect(shellEscapePath("~")).toBe("~");
  });

  it("handles tilde with spaces in path", () => {
    expect(shellEscapePath("~/my repos/my repo")).toBe("~/'my repos/my repo'");
  });

  it("handles tilde with single quotes in path", () => {
    expect(shellEscapePath("~/repos/it's")).toBe("~/'repos/it'\\''s'");
  });

  it("quotes paths with special characters", () => {
    expect(shellEscapePath("path with spaces")).toBe("'path with spaces'");
  });

  it("quotes paths with dollar sign", () => {
    expect(shellEscapePath("$HOME/repos")).toBe("'$HOME/repos'");
  });
});
