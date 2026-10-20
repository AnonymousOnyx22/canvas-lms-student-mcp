import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Walk up from this file until a folder with a package.json shows up. */
function projectRoot(): string {
  let dir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  for (let i = 0; i < 5; i++) {
    try {
      readFileSync(join(dir, "package.json"));
      return dir;
    } catch {
      dir = resolve(dir, "..");
    }
  }
  throw new Error("Could not find the project root");
}

const root = projectRoot();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const server = JSON.parse(readFileSync(join(root, "server.json"), "utf8"));

const PHRASE = "canvas lms mcp";

describe("search metadata", () => {
  it("leads with the phrase people search for on npm", () => {
    expect(pkg.description.toLowerCase().startsWith(PHRASE)).toBe(true);
    expect(server.description.toLowerCase().startsWith(PHRASE)).toBe(true);
  });

  it("keeps the registry description inside the 100 character limit", () => {
    expect(server.description.length).toBeLessThanOrEqual(100);
  });

  it("lists the phrase and its variants as keywords", () => {
    const keywords = pkg.keywords.map((k: string) => k.toLowerCase());
    expect(keywords).toContain(PHRASE);
    expect(keywords).toContain("canvas lms mcp server");
    expect(keywords).toContain("canvas mcp server");
  });

  it("keeps the package name, the bin entry and the versions as they are", () => {
    expect(pkg.name).toBe("canvas-lms-student-mcp");
    expect(pkg.bin["canvas-lms-student-mcp"]).toBe("build/src/index.js");
    expect(pkg.version).toBe(server.version);
    expect(server.packages[0].version).toBe(pkg.version);
  });
});

describe("readme", () => {
  it("shows a CI badge that points at the workflow that runs the tests", () => {
    const repoUrl = pkg.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
    const readme = readFileSync(join(root, "README.md"), "utf8");
    expect(existsSync(join(root, ".github", "workflows", "ci.yml"))).toBe(true);
    expect(readme).toContain(`${repoUrl}/actions/workflows/ci.yml/badge.svg`);
    expect(readme).toContain(`(${repoUrl}/actions/workflows/ci.yml)`);
  });
});
