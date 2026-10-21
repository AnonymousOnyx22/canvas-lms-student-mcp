import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { VERSION } from "../src/server.js";
import { tools } from "../src/tools.js";

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

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Spell a small number out, the way the docs count tools. */
function numberWords(count: number): string {
  if (count < 20) return NUMBER_WORDS[count];
  if (count < 100) {
    const tens = TENS[Math.floor(count / 10)];
    const ones = count % 10;
    return ones ? `${tens} ${NUMBER_WORDS[ones]}` : tens;
  }
  return String(count);
}

/** The sentence the README uses to say how many tools are read only. */
function readOnlySentence(count: number): string {
  const words = numberWords(count);
  const start = words[0].toUpperCase() + words.slice(1);
  return count === 1 ? "One tool is marked read only" : `${start} tools are marked read only`;
}

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

describe("registry package entry", () => {
  const npmPackage = server.packages[0];

  it("runs the server with npx the way the README says", () => {
    expect(npmPackage.runtimeHint).toBe("npx");
    expect(npmPackage.runtimeArguments).toContainEqual({ type: "positional", value: "-y" });
    expect(readFileSync(join(root, "README.md"), "utf8")).toContain("npx -y canvas-lms-student-mcp");
  });

  it("points the npm registry at the npm package it ships in", () => {
    expect(npmPackage.registryType).toBe("npm");
    expect(npmPackage.registryBaseUrl).toBe("https://registry.npmjs.org");
  });

  it("asks for every environment variable the server reads", () => {
    const source = readFileSync(join(root, "src", "cli.ts"), "utf8");
    const needed = [...source.matchAll(/env\.([A-Z0-9_]+)/g)].map((m) => m[1]);
    const names = npmPackage.environmentVariables.map((v: { name: string }) => v.name);

    expect(needed.length).toBeGreaterThan(0);
    expect(names.sort()).toEqual([...new Set(needed)].sort());
  });

  it("marks both variables as required and the token as secret", () => {
    const baseUrl = npmPackage.environmentVariables.find((v: { name: string }) => v.name === "CANVAS_BASE_URL");
    const token = npmPackage.environmentVariables.find((v: { name: string }) => v.name === "CANVAS_API_TOKEN");

    expect(baseUrl?.isRequired).toBe(true);
    expect(baseUrl?.isSecret).toBe(false);
    expect(token?.isRequired).toBe(true);
    expect(token?.isSecret).toBe(true);
  });

  it("tells the reader where each value comes from", () => {
    const baseUrl = npmPackage.environmentVariables.find((v: { name: string }) => v.name === "CANVAS_BASE_URL");
    const token = npmPackage.environmentVariables.find((v: { name: string }) => v.name === "CANVAS_API_TOKEN");

    expect(baseUrl?.description).toContain("https://myschool.instructure.com");
    expect(token?.description).toContain("New Access Token");
  });
});

describe("registry metadata", () => {
  it("gives the official registry the name, the version and the title", () => {
    expect(server.name).toBe("io.github.AnonymousOnyx22/canvas-lms-student-mcp");
    expect(server.title).toBe("Canvas LMS MCP for students");
    expect(server.version).toBe(pkg.version);
    expect(server.packages[0].identifier).toBe(pkg.name);
  });

  it("records the GitHub repository id", () => {
    expect(server.repository.id).toBe("1419670110");
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

describe("one version everywhere", () => {
  it("keeps the npm page, the registry entry and llms.txt on the same version and tool list", () => {
    const llms = readFileSync(join(root, "llms.txt"), "utf8");

    // package.json holds the version. Every other file has to follow it, so a
    // release only changes one place.
    const version = pkg.version;
    expect(version, "package.json has no version").toMatch(/^\d+\.\d+\.\d+$/);
    expect(server.version).toBe(version);
    expect(server.packages[0].version).toBe(version);
    expect(glama.version).toBe(version);
    expect(VERSION).toBe(version);

    const llmsVersion = llms.match(/^Version:\s*(\S+)\s*$/m);
    expect(llmsVersion, "llms.txt has no Version line").not.toBeNull();
    expect(llmsVersion?.[1]).toBe(version);

    const names = tools.map((t) => t.name).sort();
    const llmsNames = [...llms.matchAll(/^- ((?:get|export)_[a-z_]+):/gm)].map((m) => m[1]).sort();
    expect(llmsNames).toEqual(names);
    expect(glama.tools.map((t: { name: string }) => t.name).sort()).toEqual(names);
  });
});

describe("one tool count everywhere", () => {
  it("counts the read only tools in the code and keeps the docs on the same number", () => {
    const llms = readFileSync(join(root, "llms.txt"), "utf8");
    const readme = readFileSync(join(root, "README.md"), "utf8");

    const readOnly = tools.filter((t) => t.annotations?.readOnlyHint !== false);
    const writers = tools.filter((t) => t.annotations?.readOnlyHint === false);

    // The calendar export is the one tool that writes a file. Every other
    // tool only reads from Canvas.
    expect(writers.map((t) => t.name)).toEqual(["export_due_dates_calendar"]);

    const readOnlyWords = numberWords(readOnly.length);
    expect(llms, `llms.txt should say "${readOnlyWords} read only"`).toContain(`${readOnlyWords} read only`);

    const writerWords = numberWords(writers.length);
    const writerPhrase =
      writers.length === 1 ? `${writerWords} writes a calendar file` : `${writerWords} write calendar files`;
    expect(llms, `llms.txt should say "${writerPhrase}"`).toContain(writerPhrase);

    const sentence = readOnlySentence(readOnly.length);
    expect(readme, `README should say "${sentence}"`).toContain(sentence);
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
