#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const dist = resolve(root, "dist");
const releases = resolve(root, "releases");
const outName = `${pkg.name}-v${pkg.version}.zip`;
const outPath = resolve(releases, outName);

if (!existsSync(dist)) {
  console.error("dist/ not found. Run `pnpm build` first.");
  process.exit(1);
}

mkdirSync(releases, { recursive: true });
if (existsSync(outPath)) rmSync(outPath);

execFileSync("zip", ["-r", outPath, "."], { cwd: dist, stdio: "inherit" });

console.log(`\nCreated: ${outPath}`);
