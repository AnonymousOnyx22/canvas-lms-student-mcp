import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ApiError, createClient, describeStatus } from "../src/core/http.js";
import { createServer } from "../src/server.js";
import { tools } from "../src/tools.js";
import { normalizeBaseUrl } from "../src/config.js";

const future = new Date(Date.now() + 2 * 86400000).toISOString();
const past = new Date(Date.now() - 2 * 86400000).toISOString();
const longAgo = new Date(Date.now() - 30 * 86400000).toISOString();

let srv: http.Server;
let base = "";
let lastAuth = "";

beforeAll(async () => {
  srv = http.createServer((req, res) => {
    lastAuth = String(req.headers.authorization ?? "");
    const url = new URL(req.url!, "http://x");
    const json = (data: unknown, headers: Record<string, string> = {}) => {
      res.writeHead(200, { "content-type": "application/json", ...headers });
      res.end(JSON.stringify(data));
    };
    if (lastAuth !== "Bearer good-token") {
      res.writeHead(401);
      return res.end("{}");
    }
    const p = url.pathname;
    if (p === "/api/v1/users/self") return json({ name: "Test Student" });
    if (p === "/api/v1/courses") {
      if (url.searchParams.get("page") === "2") return json([{ id: 3, name: "History 101", course_code: "HIS101" }]);
      const withScores = url.searchParams.getAll("include[]").includes("total_scores");
      const list = [
        { id: 1, name: "Networking 1", course_code: "NET1", enrollments: withScores ? [{ type: "student", computed_current_score: 91.5, computed_current_grade: "A" }] : undefined },
        { id: 2, name: "Scripting", course_code: "SCR2", enrollments: withScores ? [{ type: "student", computed_current_score: null, computed_current_grade: null }] : undefined },
        { id: 99 },
      ];
      return json(list, { link: `<${base}/api/v1/courses?page=2&enrollment_state=active>; rel="next"` });
    }
    if (p === "/api/v1/users/self/todo") return json([{ context_name: "Networking 1", assignment: { name: "Lab 4", due_at: future } }]);
    if (p === "/api/v1/users/self/upcoming_events")
      return json([
        { title: "Quiz 2", context_name: "Scripting", start_at: future, assignment: { due_at: future } },
        { title: "Lab 4", context_name: "Networking 1", start_at: new Date(Date.now() + 86400000).toISOString(), assignment: { due_at: new Date(Date.now() + 86400000).toISOString() } },
      ]);
    if (p === "/api/v1/users/self/missing_submissions") return json([{ name: "Reflection", course_id: 1, due_at: past, course: { name: "Networking 1" } }]);
    if (p === "/api/v1/courses/1/assignments")
      return json([
        { name: "Lab 3", due_at: past, points_possible: 10, submission: { workflow_state: "graded", score: 9, graded_at: past } },
        { name: "Lab 4", due_at: future, points_possible: 10, submission: { workflow_state: "unsubmitted" } },
        { name: "Lab 5", due_at: future, points_possible: 10, submission: { workflow_state: "submitted" } },
        { name: "Lab 2", due_at: past, points_possible: 10, submission: { workflow_state: "unsubmitted", missing: true } },
      ]);
    if (p === "/api/v1/courses/2/assignments")
      return json([
        { name: "Quiz 0", due_at: longAgo, points_possible: 10, submission: { workflow_state: "graded", score: 10, graded_at: longAgo } },
        { name: "Essay 1", due_at: past, points_possible: 100, submission: { workflow_state: "graded", score: 88, graded_at: past } },
      ]);
    if (p === "/api/v1/courses/3/assignments") return json([]);
    if (p === "/api/v1/courses/1/modules") return json([{ name: "Week 1", items: [{ title: "Intro video", type: "ExternalUrl" }] }]);
    if (p === "/api/v1/courses/1") return json({ syllabus_body: "<p>Welcome &amp; hello</p><script>x()</script><p>Grading</p>" });
    if (p === "/api/v1/announcements") {
      const codes = url.searchParams.getAll("context_codes[]");
      return json(codes.length ? [{ title: "Midterm moved", posted_at: past, message: "<p>See <b>new</b> date</p>" }] : []);
    }
    if (p === "/api/v1/courses/1/discussion_topics") return json([{ title: "Week 1 intro", posted_at: past, unread_count: 2 }]);
    if (p === "/api/v1/courses/2/discussion_topics") return json([{ title: "Essay feedback", posted_at: past, unread_count: 1 }]);
    if (p === "/api/v1/courses/3/discussion_topics") return json([]);
    if (p === "/api/v1/calendar_events") return json([{ title: "Exam", start_at: future, context_name: "Scripting" }]);
    if (p === "/api/v1/courses/403") {
      res.writeHead(403, { "content-type": "application/json" });
      return res.end(JSON.stringify({ errors: [{ message: "user not authorized" }] }));
    }
    if (p === "/api/v1/courses/429/assignments") {
      res.writeHead(429, { "content-type": "application/json", "retry-after": "30" });
      return res.end(JSON.stringify({ errors: [{ message: "Rate limit exceeded, too many requests" }] }));
    }
    if (p === "/api/v1/courses/7") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end("<html><body>This is not Canvas.</body></html>");
    }
    if (p === "/api/v1/courses/8") {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end("");
    }
    res.writeHead(404);
    res.end("{}");
  });
  await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => srv.close(() => r())));

async function connect(token = "good-token") {
  const api = createClient({ baseUrl: base, headers: { Authorization: `Bearer ${token}` } });
  const server = createServer(api);
  const [a, b] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const res: any = await client.callTool({ name, arguments: args });
  return { text: res.content[0].text as string, isError: Boolean(res.isError) };
}

describe("canvas-lms-student-mcp", () => {
  it("exposes only read-only tools", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.length).toBe(12);
    for (const t of tools) expect(t.annotations?.readOnlyHint).toBe(true);
  });

  it("describes every tool as Canvas specific and includes an example prompt", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    for (const t of tools) {
      expect(t.description, t.name).toContain("Canvas");
      expect(t.description, t.name).toMatch(/Example: "[^"]+"/);
    }
  });

  it("registers every tool from src/tools.ts and keeps the docs in step", async () => {
    const client = await connect();
    const { tools: listed } = await client.listTools();

    // The tool list in src/tools.ts is the source of truth. Update this snapshot
    // when a tool is added, and the README and llms.txt with it.
    expect(listed.length).toBe(12);
    expect(listed.map((t) => t.name)).toMatchInlineSnapshot(`
      [
        "get_my_courses",
        "get_todo",
        "get_upcoming_due_dates",
        "get_missing_assignments",
        "get_assignments",
        "get_my_grades",
        "get_course_content",
        "get_syllabus",
        "get_announcements",
        "get_whats_new",
        "get_discussions",
        "get_calendar_events",
      ]
    `);

    const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
    const llms = readFileSync(new URL("../llms.txt", import.meta.url), "utf8");

    for (const def of tools) {
      const registered = listed.find((t) => t.name === def.name);
      expect(registered, `tool ${def.name} is not registered`).toBeDefined();
      expect(registered?.description, `description of ${def.name}`).toBe(def.description);

      const example = def.description.match(/Example: "([^"]+)"/)?.[1];
      expect(example, `example prompt of ${def.name}`).toBeDefined();
      expect(readme, `README row for ${def.name}`).toContain(`| \`${def.name}\` |`);
      expect(readme, `README example for ${def.name}`).toContain(`"${example}"`);
      expect(llms, `llms.txt entry for ${def.name}`).toContain(`- ${def.name}: ${def.description}`);
    }

    expect(readme).toContain(`All ${listed.length} tools`);
  });

  it("keeps glama.json in step with the tools the server registers", async () => {
    const client = await connect();
    const { tools: listed } = await client.listTools();
    const glama = JSON.parse(readFileSync(new URL("../glama.json", import.meta.url), "utf8"));

    expect(glama.maintainers).toContain("AnonymousOnyx22");
    expect(glama.tools.length).toBe(listed.length);
    expect(glama.tools.map((t: { name: string }) => t.name)).toEqual(listed.map((t) => t.name));

    for (const def of tools) {
      const entry = glama.tools.find((t: { name: string }) => t.name === def.name);
      expect(entry, `glama.json entry for ${def.name}`).toBeDefined();
      expect(entry?.description, `glama.json description of ${def.name}`).toBe(def.description);
    }
  });

  it("lists courses and follows pagination", async () => {
    const { text } = await call(await connect(), "get_my_courses");
    expect(text).toContain("Networking 1");
    expect(text).toContain("History 101");
    expect(text).not.toContain("id 99");
  });

  it("reports grades and handles ungraded courses", async () => {
    const { text } = await call(await connect(), "get_my_grades");
    expect(text).toContain("Networking 1 91.5% (A)");
    expect(text).toContain("Scripting no grade posted yet");
  });

  it("breaks each course grade down into assignment scores and submission status", async () => {
    const { text } = await call(await connect(), "get_my_grades");
    expect(text).toMatch(/Lab 3: graded 9\/10/);
    expect(text).toMatch(/Lab 5: submitted \(10 pts\)/);
    expect(text).toMatch(/Lab 2: missing \(10 pts\)/);
    expect(text).not.toContain("Lab 4");
    expect(text).toMatch(/Essay 1: graded 88\/100/);
  });

  it("limits the grade breakdown to one course when course_id is passed", async () => {
    const { text } = await call(await connect(), "get_my_grades", { course_id: 2 });
    expect(text).toContain("Scripting");
    expect(text).not.toContain("Networking 1");
    expect(text).toMatch(/Essay 1: graded 88\/100/);
  });

  it("explains an unknown course id in get_my_grades", async () => {
    const { text } = await call(await connect(), "get_my_grades", { course_id: 55 });
    expect(text).toContain("No active Canvas course with id 55");
    expect(text).toContain("get_my_courses");
  });

  it("shows todo, upcoming sorted by date, and missing work", async () => {
    const c = await connect();
    expect((await call(c, "get_todo")).text).toContain("Lab 4");
    const up = (await call(c, "get_upcoming_due_dates")).text;
    expect(up.indexOf("Lab 4")).toBeLessThan(up.indexOf("Quiz 2"));
    expect((await call(c, "get_missing_assignments")).text).toContain("Reflection");
  });

  it("labels submission status per assignment", async () => {
    const { text } = await call(await connect(), "get_assignments", { course_id: 1 });
    expect(text).toContain("Lab 3");
    expect(text).toMatch(/Lab 3.*graded 9\/10/);
    expect(text).toMatch(/Lab 4.*not submitted/);
    expect(text).toMatch(/Lab 5.*submitted/);
    expect(text).toMatch(/Lab 2.*missing/);
  });

  it("reads content, syllabus (HTML stripped), announcements and discussions", async () => {
    const c = await connect();
    expect((await call(c, "get_course_content", { course_id: 1 })).text).toContain("Intro video");
    const syl = (await call(c, "get_syllabus", { course_id: 1 })).text;
    expect(syl).toContain("Welcome & hello");
    expect(syl).not.toContain("<p>");
    expect(syl).not.toContain("x()");
    expect((await call(c, "get_announcements")).text).toContain("Midterm moved");
    expect((await call(c, "get_discussions", { course_id: 1 })).text).toContain("2 unread");
    expect((await call(c, "get_calendar_events", { start_date: "2026-10-01" })).text).toContain("Exam");
  });

  it("summarizes new announcements, newly graded work and unread replies in get_whats_new", async () => {
    const { text } = await call(await connect(), "get_whats_new");
    expect(text).toContain("Midterm moved");
    expect(text).toContain("See new date");
    expect(text).toMatch(/Lab 3: 9\/10 in Networking 1/);
    expect(text).toMatch(/Essay 1: 88\/100 in Scripting/);
    expect(text).not.toContain("Quiz 0");
    expect(text).toContain("Week 1 intro (2 unread in Networking 1");
    expect(text).toContain("Essay feedback (1 unread in Scripting");
  });

  it("narrows get_whats_new to one course or a shorter window", async () => {
    const one = (await call(await connect(), "get_whats_new", { course_id: 2 })).text;
    expect(one).toContain("Essay 1: 88/100");
    expect(one).not.toContain("Lab 3");
    expect(one).not.toContain("Week 1 intro");
    const short = (await call(await connect(), "get_whats_new", { since_days: 1 })).text;
    expect(short).toContain("Week 1 intro");
    expect(short).not.toContain("Midterm moved");
    expect(short).not.toContain("Essay 1");
  });

  it("says nothing is new when the window excludes everything", async () => {
    const { text, isError } = await call(await connect(), "get_whats_new", { since_days: 1, course_id: 3 });
    expect(isError).toBe(false);
    expect(text).toContain("Nothing new in Canvas");
    expect(text).toContain("1 day");
  });

  it("explains an unknown course id in get_whats_new", async () => {
    const { text } = await call(await connect(), "get_whats_new", { course_id: 55 });
    expect(text).toContain("No active Canvas course with id 55");
    expect(text).toContain("get_my_courses");
  });

  it("returns a friendly, actionable error when the token is bad", async () => {
    const { text, isError } = await call(await connect("nope"), "get_my_courses");
    expect(isError).toBe(true);
    expect(text).toContain("Not signed in");
    expect(text).toContain("New Access Token");
    expect(text).toContain("doctor");
  });

  it("returns an actionable error for a forbidden course", async () => {
    const { text, isError } = await call(await connect(), "get_syllabus", { course_id: 403 });
    expect(isError).toBe(true);
    expect(text).toContain("Access denied");
    expect(text).toContain("user not authorized");
  });

  it("returns an actionable error when rate limited, including how long to wait", async () => {
    const { text, isError } = await call(await connect(), "get_assignments", { course_id: 429 });
    expect(isError).toBe(true);
    expect(text).toContain("Rate limited");
    expect(text).toContain("30 seconds");
  });

  it("blames CANVAS_BASE_URL when the server is not Canvas", async () => {
    const html = await call(await connect(), "get_syllabus", { course_id: 7 });
    expect(html.isError).toBe(true);
    expect(html.text).toContain("did not return Canvas API JSON");
    expect(html.text).toContain("CANVAS_BASE_URL");
    const empty = await call(await connect(), "get_syllabus", { course_id: 8 });
    expect(empty.isError).toBe(true);
    expect(empty.text).toContain("empty response");
    expect(empty.text).toContain("CANVAS_BASE_URL");
  });

  it("returns a friendly error for an unknown course", async () => {
    const { text, isError } = await call(await connect(), "get_syllabus", { course_id: 404 });
    expect(isError).toBe(true);
    expect(text).toContain("Not found");
  });

  it("normalizes school URLs", () => {
    expect(normalizeBaseUrl("myschool.instructure.com")).toBe("https://myschool.instructure.com");
    expect(normalizeBaseUrl("https://myschool.instructure.com/api/v1/")).toBe("https://myschool.instructure.com");
  });
});

describe("status messages", () => {
  it("adds the Canvas message and a token fix to 401", () => {
    const body = JSON.stringify({ errors: [{ message: "Invalid access token." }] });
    const msg = describeStatus(401, { body, host: "myschool.instructure.com" });
    expect(msg).toContain("Not signed in");
    expect(msg).toContain("myschool.instructure.com");
    expect(msg).toContain("Invalid access token.");
    expect(msg).toContain("New Access Token");
  });

  it("says how long to wait after a 429", () => {
    expect(describeStatus(429, { retryAfter: "45" })).toContain("45 seconds");
    expect(describeStatus(429, { retryAfter: null })).toContain("a minute");
  });

  it("explains access denied on 403", () => {
    const body = JSON.stringify({ errors: [{ message: "user not authorized" }] });
    const msg = describeStatus(403, { body, host: "myschool.instructure.com" });
    expect(msg).toContain("Access denied");
    expect(msg).toContain("myschool.instructure.com");
    expect(msg).toContain("user not authorized");
    expect(msg).toContain("turned this feature off for students");
  });

  it("points a 401 at the doctor command", () => {
    expect(describeStatus(401, {})).toContain("canvas-lms-student-mcp doctor");
  });

  it("blames CANVAS_BASE_URL when the answer is not Canvas JSON", async () => {
    const html = createClient({
      baseUrl: "https://canvas.example.edu",
      fetchImpl: (async () =>
        new Response("<html><body>Not Canvas</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        })) as unknown as typeof fetch,
    });
    const err = (await html.get("/api/v1/users/self").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain("did not return Canvas API JSON");
    expect(err.message).toContain("text/html");
    expect(err.message).toContain("canvas.example.edu");
    expect(err.message).toContain("CANVAS_BASE_URL");
  });

  it("blames CANVAS_BASE_URL when the answer is empty", async () => {
    const empty = createClient({
      baseUrl: "https://canvas.example.edu",
      fetchImpl: (async () =>
        new Response("", { status: 200, headers: { "content-type": "application/json" } })) as unknown as typeof fetch,
    });
    const err = (await empty.get("/api/v1/users/self").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain("empty response instead of Canvas API JSON");
    expect(err.message).toContain("CANVAS_BASE_URL");
  });

  it("explains unreachable hosts", async () => {
    const failure = Object.assign(new Error("getaddrinfo ENOTFOUND canvas.example.edu"), { code: "ENOTFOUND" });
    const api = createClient({
      baseUrl: "https://canvas.example.edu",
      fetchImpl: (async () => {
        throw failure;
      }) as unknown as typeof fetch,
    });
    const err = (await api.get("/api/v1/courses").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain("Could not reach canvas.example.edu");
    expect(err.message).toContain("CANVAS_BASE_URL");
  });
});
