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
const glama = JSON.parse(readFileSync(join(root, "glama.json"), "utf8"));

const PHRASE = "canvas lms mcp";
const REPO_URL = "https://github.com/AnonymousOnyx22/canvas-lms-student-mcp";

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

describe("registry metadata", () => {
  it("gives the official registry the name, the version and the title", () => {
    expect(server.name).toBe("io.github.AnonymousOnyx22/canvas-lms-student-mcp");
    expect(server.title).toBe("Canvas LMS MCP for students");
    expect(server.version).toBe(pkg.version);
    expect(server.packages[0].identifier).toBe(pkg.name);
  });

  it("gives the directory listing the name, the version and the type", () => {
    expect(glama.name).toBe(server.name);
    expect(glama.version).toBe(pkg.version);
    expect(glama.type).toBe("stdio");
    expect(glama.maintainers).toContain("AnonymousOnyx22");
    expect(glama.description.toLowerCase().startsWith(PHRASE)).toBe(true);
  });

  it("points both registry files at the same repository and homepage", () => {
    for (const file of [server, glama]) {
      expect(file.repository.url).toBe(REPO_URL);
      expect(file.repository.source).toBe("github");
      expect(file.homepage).toBe(pkg.homepage);
    }
    expect(server.websiteUrl).toBe(pkg.homepage);
  });

  it("carries the MIT license in both registry files", () => {
    expect(pkg.license).toBe("MIT");
    expect(server.license).toBe(pkg.license);
    expect(glama.license).toBe(pkg.license);
  });

  it("lists keywords in both registry files that npm also lists", () => {
    const pkgKeywords = pkg.keywords.map((k: string) => k.toLowerCase());

    for (const file of [server, glama]) {
      expect(Array.isArray(file.keywords)).toBe(true);
      expect(file.keywords.length).toBeGreaterThan(0);
      expect(file.keywords.map((k: string) => k.toLowerCase())).toContain(PHRASE);

      for (const keyword of file.keywords) {
        expect(pkgKeywords, `keyword ${keyword}`).toContain(keyword.toLowerCase());
      }
    }
  });
});

describe("published files", () => {
  it("ships the registry files in the npm package", () => {
    expect(pkg.files).toContain("server.json");
    expect(pkg.files).toContain("glama.json");
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
