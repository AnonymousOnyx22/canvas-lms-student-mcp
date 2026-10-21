import { z } from "zod";
import type { HttpClient } from "./core/http.js";
import { type ToolDef, bullets, fmtDate, stripHtml } from "./core/tools.js";

type Api = HttpClient;

const courseId = z
  .union([z.string(), z.number()])
  .describe("Canvas course ID, the number Canvas shows for the course. Ask get_my_courses for it first.");

interface Course {
  id: number;
  name?: string;
  course_code?: string;
  enrollments?: { type: string; computed_current_score?: number | null; computed_current_grade?: string | null }[];
}

async function activeCourses(api: Api, extra: Record<string, string[]> = {}): Promise<Course[]> {
  const courses = await api.getAll<Course>("/api/v1/courses", {
    enrollment_state: "active",
    per_page: 100,
    ...extra,
  });
  return courses.filter((c) => c.name);
}

function submissionLine(a: any): string {
  const s = a.submission;
  let status = "not submitted";
  if (s) {
    if (s.workflow_state === "graded" || s.score != null) {
      status = `graded${s.score != null ? ` ${s.score}/${a.points_possible ?? "?"}` : ""}`;
    } else if (s.workflow_state === "submitted" || s.workflow_state === "pending_review") {
      status = "submitted";
    }
    if (s.missing) status = "missing";
    if (s.excused) status = "excused";
  }
  return status;
}

export const tools: ToolDef<Api>[] = [
  {
    name: "get_my_courses",
    title: "My courses",
    description:
      "List your active Canvas courses with their Canvas course IDs. Example: \"What are my Canvas courses this term?\"",
    inputSchema: {},
    run: async (_args, api) => {
      const courses = await activeCourses(api);
      return bullets(courses.map((c) => `${c.name}${c.course_code ? ` (${c.course_code})` : ""} [id ${c.id}]`), "No active courses found.");
    },
  },
  {
    name: "get_todo",
    title: "To-do list",
    description:
      "Your Canvas to-do list: assignments and discussions Canvas says still need attention, with due dates. Example: \"What does Canvas say I still need to do?\"",
    inputSchema: {},
    run: async (_args, api) => {
      const items = await api.getAll<any>("/api/v1/users/self/todo", { per_page: 50 });
      return bullets(
        items.map((i) => {
          const a = i.assignment ?? {};
          return `${a.name ?? i.title ?? "Untitled"} (${i.context_name ?? "course"}) due ${fmtDate(a.due_at)}`;
        }),
        "Nothing on your to-do list.",
      );
    },
  },
  {
    name: "get_upcoming_due_dates",
    title: "Upcoming due dates",
    description:
      "Upcoming assignments and events across every Canvas course, soonest first. Example: \"What is due in Canvas this week?\"",
    inputSchema: {},
    run: async (_args, api) => {
      const items = await api.getAll<any>("/api/v1/users/self/upcoming_events", { per_page: 50 });
      const rows = items
        .map((e) => ({
          when: e.assignment?.due_at ?? e.start_at ?? null,
          text: `${e.title ?? e.assignment?.name ?? "Untitled"} (${e.context_name ?? "course"}) due ${fmtDate(e.assignment?.due_at ?? e.start_at)}`,
        }))
        .sort((a, b) => (a.when ?? "9").localeCompare(b.when ?? "9"));
      return bullets(rows.map((r) => r.text), "No upcoming due dates.");
    },
  },
  {
    name: "get_missing_assignments",
    title: "Missing assignments",
    description:
      "Past-due Canvas assignments you have not submitted, with the course and the day each was due. Example: \"What am I missing in Canvas?\"",
    inputSchema: {},
    run: async (_args, api) => {
      const items = await api.getAll<any>("/api/v1/users/self/missing_submissions", { "include[]": ["course"], per_page: 50 });
      return bullets(
        items.map((a) => `${a.name} (${a.course?.name ?? `course ${a.course_id}`}) was due ${fmtDate(a.due_at)}`),
        "No missing assignments.",
      );
    },
  },
  {
    name: "get_assignments",
    title: "Course assignments",
    description:
      "Assignments for one Canvas course. Pass course_id (ask get_my_courses for it) and get due dates, points and submission status: not submitted, submitted, graded, missing or excused. Set bucket to filter, for example overdue. Example: \"Which Canvas assignments in Networking 1 are overdue?\"",
    inputSchema: {
      course_id: courseId,
      bucket: z
        .enum(["upcoming", "future", "past", "overdue", "undated", "ungraded", "unsubmitted"])
        .optional()
        .describe("Optional filter, for example overdue or upcoming."),
    },
    run: async ({ course_id, bucket }, api) => {
      const items = await api.getAll<any>(`/api/v1/courses/${course_id}/assignments`, {
        bucket,
        "include[]": ["submission"],
        order_by: "due_at",
        per_page: 100,
      });
      return bullets(
        items.map((a) => `${a.name} due ${fmtDate(a.due_at)} (${a.points_possible ?? "?"} pts) ${submissionLine(a)}`),
        "No assignments found.",
      );
    },
  },
  {
    name: "get_my_grades",
    title: "My grades",
    description:
      "Your current grade in each active Canvas course from the Canvas gradebook, with the assignments behind each grade: your score, the points possible and the submission status. Pass course_id (ask get_my_courses for it) for one course only. Example: \"What is my grade in each Canvas course and which assignments make it up?\"",
    inputSchema: {
      course_id: courseId.optional().describe("Optional, limit the grades and the breakdown to one course."),
    },
    run: async ({ course_id }, api) => {
      const courses = await activeCourses(api, { "include[]": ["total_scores"] });
      const shown = course_id == null ? courses : courses.filter((c) => String(c.id) === String(course_id));
      if (!shown.length) {
        return course_id != null
          ? `No active Canvas course with id ${course_id}. Ask get_my_courses for the right id.`
          : "No grades found.";
      }
      const sections: string[] = [];
      for (const c of shown) {
        const e = c.enrollments?.find((x) => x.type === "student") ?? c.enrollments?.[0];
        const score = e?.computed_current_score;
        const grade = e?.computed_current_grade;
        const head =
          score == null && !grade
            ? `${c.name} no grade posted yet`
            : `${c.name} ${score != null ? `${score}%` : ""}${grade ? ` (${grade})` : ""}`.trim();
        let rows: string[];
        try {
          const items = await api.getAll<any>(`/api/v1/courses/${c.id}/assignments`, {
            "include[]": ["submission"],
            order_by: "due_at",
            per_page: 100,
          });
          rows = items
            .filter((a) => submissionLine(a) !== "not submitted")
            .map((a) => {
              const status = submissionLine(a);
              const pts = a.points_possible != null && !status.includes("/") ? ` (${a.points_possible} pts)` : "";
              return `  - ${a.name}: ${status}${pts}`;
            });
        } catch {
          rows = ["  - Canvas would not list the assignments for this course."];
        }
        if (rows.length > 25) {
          const rest = rows.length - 25;
          rows = [...rows.slice(0, 25), `  - and ${rest} more. Ask get_assignments for the full list.`];
        }
        sections.push(rows.length ? `- ${head}\n${rows.join("\n")}` : `- ${head}`);
      }
      return sections.join("\n");
    },
  },
  {
    name: "get_course_content",
    title: "Course content",
    description:
      "Modules and module items for one Canvas course. Pass course_id (ask get_my_courses for it). Example: \"Show me the Week 3 module in my Canvas Networking course.\"",
    inputSchema: { course_id: courseId },
    run: async ({ course_id }, api) => {
      const modules = await api.getAll<any>(`/api/v1/courses/${course_id}/modules`, { "include[]": ["items"], per_page: 50 });
      if (!modules.length) return "This course has no modules.";
      return modules
        .map((m) => {
          const items = (m.items ?? []).slice(0, 40).map((i: any) => `  - ${i.title} (${i.type})`);
          return `${m.name}\n${items.join("\n") || "  (empty)"}`;
        })
        .join("\n\n");
    },
  },
  {
    name: "get_syllabus",
    title: "Syllabus",
    description:
      "The syllabus text for one Canvas course, with HTML removed. Pass course_id (ask get_my_courses for it). Example: \"What does the Canvas syllabus say about grading in Scripting?\"",
    inputSchema: { course_id: courseId },
    run: async ({ course_id }, api) => {
      const c = await api.get<any>(`/api/v1/courses/${course_id}`, { "include[]": ["syllabus_body"] });
      return stripHtml(c.syllabus_body) || "This course has no syllabus posted.";
    },
  },
  {
    name: "get_announcements",
    title: "Announcements",
    description:
      "Recent Canvas announcements, either for the course_ids you pass or for all your active courses. Example: \"What did my instructors announce in Canvas lately?\"",
    inputSchema: { course_ids: z.array(courseId).optional() },
    run: async ({ course_ids }, api) => {
      const ids: (string | number)[] = course_ids?.length ? course_ids : (await activeCourses(api)).map((c) => c.id);
      if (!ids.length) return "No active courses found.";
      const items = await api.getAll<any>("/api/v1/announcements", {
        "context_codes[]": ids.slice(0, 30).map((i) => `course_${i}`),
        active_only: true,
        per_page: 20,
      });
      return bullets(
        items.slice(0, 20).map((a) => `${a.title} (${fmtDate(a.posted_at)})\n  ${stripHtml(a.message, 400).replace(/\n/g, " ")}`),
        "No recent announcements.",
      );
    },
  },
  {
    name: "get_discussions",
    title: "Discussions",
    description:
      "Discussion topics for one Canvas course, with unread counts. Pass course_id (ask get_my_courses for it). Example: \"What discussions are open in my Canvas Networking course?\"",
    inputSchema: { course_id: courseId },
    run: async ({ course_id }, api) => {
      const items = await api.getAll<any>(`/api/v1/courses/${course_id}/discussion_topics`, { per_page: 30 });
      return bullets(
        items.map((d) => `${d.title} posted ${fmtDate(d.posted_at)}${d.unread_count ? ` (${d.unread_count} unread)` : ""}`),
        "No discussions.",
      );
    },
  },
  {
    name: "get_calendar_events",
    title: "Calendar events",
    description:
      "Canvas calendar events and assignment due dates. Pass start_date and end_date as YYYY-MM-DD to limit the range. Example: \"What is on my Canvas calendar between 2026-10-01 and 2026-10-31?\"",
    inputSchema: {
      start_date: z.string().optional().describe("Start date, YYYY-MM-DD"),
      end_date: z.string().optional().describe("End date, YYYY-MM-DD"),
    },
    run: async ({ start_date, end_date }, api) => {
      const items = await api.getAll<any>("/api/v1/calendar_events", { start_date, end_date, per_page: 100 });
      return bullets(
        items.map((e) => `${e.title} on ${fmtDate(e.start_at ?? e.assignment?.due_at)}${e.context_name ? ` (${e.context_name})` : ""}`),
        "No calendar events in that range.",
      );
    },
  },
];
