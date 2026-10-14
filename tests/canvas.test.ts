import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createClient } from "../src/core/http.js";
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
    if (p === "/api/v1/courses/1/modules") return json([{ name: "Week 1", items: [{ title: "Intro video", type: "ExternalUrl" }] }]);
    if (p === "/api/v1/courses/1") return json({ syllabus_body: "<p>Welcome &amp; hello</p><script>x()</script><p>Grading</p>" });
    if (p === "/api/v1/announcements") {
      const codes = url.searchParams.getAll("context_codes[]");
      return json(codes.length ? [{ title: "Midterm moved", posted_at: past, message: "<p>See <b>new</b> date</p>" }] : []);
    }
    if (p === "/api/v1/courses/1/discussion_topics") return json([{ title: "Week 1 intro", posted_at: past, unread_count: 2 }]);
    if (p === "/api/v1/calendar_events") return json([{ title: "Exam", start_at: future, context_name: "Scripting" }]);
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

  it("returns a friendly error when the token is bad", async () => {
    const { text, isError } = await call(await connect("nope"), "get_my_courses");
    expect(isError).toBe(true);
    expect(text).toContain("Not signed in");
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
