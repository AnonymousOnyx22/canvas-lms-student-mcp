import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ApiError, createClient, describeStatus } from "../src/core/http.js";
import { createServer } from "../src/server.js";
import { normalizeBaseUrl } from "../src/config.js";

const future = new Date(Date.now() + 2 * 86400000).toISOString();
const past = new Date(Date.now() - 2 * 86400000).toISOString();

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
        { name: "Lab 3", due_at: past, points_possible: 10, submission: { workflow_state: "graded", score: 9 } },
        { name: "Lab 4", due_at: future, points_possible: 10, submission: { workflow_state: "unsubmitted" } },
        { name: "Lab 5", due_at: future, points_possible: 10, submission: { workflow_state: "submitted" } },
        { name: "Lab 2", due_at: past, points_possible: 10, submission: { workflow_state: "unsubmitted", missing: true } },
      ]);
    if (p === "/api/v1/courses/2/assignments")
      return json([{ name: "Essay 1", due_at: past, points_possible: 100, submission: { workflow_state: "graded", score: 88 } }]);
    if (p === "/api/v1/courses/1/modules") return json([{ name: "Week 1", items: [{ title: "Intro video", type: "ExternalUrl" }] }]);
    if (p === "/api/v1/courses/1") return json({ syllabus_body: "<p>Welcome &amp; hello</p><script>x()</script><p>Grading</p>" });
    if (p === "/api/v1/announcements") {
      const codes = url.searchParams.getAll("context_codes[]");
      return json(codes.length ? [{ title: "Midterm moved", posted_at: past, message: "<p>See <b>new</b> date</p>" }] : []);
    }
    if (p === "/api/v1/courses/1/discussion_topics") return json([{ title: "Week 1 intro", posted_at: past, unread_count: 2 }]);
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
    expect(tools.length).toBe(11);
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
