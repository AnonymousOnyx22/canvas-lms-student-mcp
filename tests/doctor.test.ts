import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { runCli } from "../src/cli.js";

/**
 * A fake Canvas that answers the doctor request the way a real school does.
 * The token picks the answer so each error path can be tested on its own.
 */
const tokens = {
  good: "good-token",
  bad: "bad-token",
  forbidden: "forbidden-token",
  limited: "limited-token",
  notCanvas: "not-canvas-token",
};

let srv: http.Server;
let base = "";

beforeAll(async () => {
  srv = http.createServer((req, res) => {
    const auth = String(req.headers.authorization ?? "");
    if (auth === `Bearer ${tokens.good}`) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ name: "Test Student" }));
    }
    if (auth === `Bearer ${tokens.forbidden}`) {
      res.writeHead(403, { "content-type": "application/json" });
      return res.end(JSON.stringify({ errors: [{ message: "user not authorized" }] }));
    }
    if (auth === `Bearer ${tokens.limited}`) {
      res.writeHead(429, { "content-type": "application/json", "retry-after": "30" });
      return res.end(JSON.stringify({ errors: [{ message: "Rate limit exceeded, too many requests" }] }));
    }
    if (auth === `Bearer ${tokens.notCanvas}`) {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end("<html><body>This is not Canvas.</body></html>");
    }
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ errors: [{ message: "Invalid access token." }] }));
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => srv.close(() => r())));

async function doctor(env: Record<string, string | undefined>) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(["doctor"], {
    env: { CANVAS_BASE_URL: base, ...env },
    io: { out: (l) => out.push(l), err: (l) => err.push(l) },
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

describe("doctor", () => {
  it("reports the account it connected as", async () => {
    const { code, out } = await doctor({ CANVAS_API_TOKEN: tokens.good });
    expect(code).toBe(0);
    expect(out).toContain(`Connected to ${base} as Test Student.`);
    expect(out).not.toContain("Could not connect");
  });

  it("explains a bad token and says how to fix it", async () => {
    const { code, out, err } = await doctor({ CANVAS_API_TOKEN: tokens.bad });
    expect(code).toBe(1);
    expect(err).toContain("Could not connect.");
    expect(err).toContain("Not signed in");
    expect(err).toContain("Invalid access token.");
    expect(err).toContain("New Access Token");
    expect(err).toContain("doctor");
    expect(out).toBe("");
  });

  it("explains that access was denied", async () => {
    const { code, err } = await doctor({ CANVAS_API_TOKEN: tokens.forbidden });
    expect(code).toBe(1);
    expect(err).toContain("Access denied");
    expect(err).toContain("user not authorized");
    expect(err).toContain("turned this feature off for students");
  });

  it("says how long to wait when the school rate limits the request", async () => {
    const { code, err } = await doctor({ CANVAS_API_TOKEN: tokens.limited });
    expect(code).toBe(1);
    expect(err).toContain("Rate limited");
    expect(err).toContain("30 seconds");
  });

  it("blames CANVAS_BASE_URL when the answer is not Canvas", async () => {
    const { code, err } = await doctor({ CANVAS_API_TOKEN: tokens.notCanvas });
    expect(code).toBe(1);
    expect(err).toContain("did not return Canvas API JSON");
    expect(err).toContain("CANVAS_BASE_URL");
  });

  it("asks for the two environment variables it needs", async () => {
    const noUrl = await doctor({ CANVAS_BASE_URL: undefined, CANVAS_API_TOKEN: tokens.good });
    expect(noUrl.code).toBe(1);
    expect(noUrl.err).toContain("Missing CANVAS_BASE_URL");
    expect(noUrl.err).toContain("https://myschool.instructure.com");

    const noToken = await doctor({ CANVAS_BASE_URL: base, CANVAS_API_TOKEN: "" });
    expect(noToken.code).toBe(1);
    expect(noToken.err).toContain("Missing CANVAS_API_TOKEN");
    expect(noToken.err).toContain("New Access Token");
  });

  it("prints the help text and the version without needing a token", async () => {
    const out: string[] = [];
    const io = { out: (l: string) => out.push(l), err: () => {} };
    expect(await runCli(["--help"], { env: {}, io })).toBe(0);
    expect(out.join("\n")).toContain("doctor");
    expect(out.join("\n")).toContain("CANVAS_BASE_URL");

    const version: string[] = [];
    expect(await runCli(["--version"], { env: {}, io: { out: (l) => version.push(l), err: () => {} } })).toBe(0);
    expect(version.join("\n")).toMatch(/^\d+\.\d+\.\d+/);
  });
});
