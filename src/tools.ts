import { z } from "zod";
import type { HttpClient } from "./core/http.js";
import { type ToolDef, bullets, fmtDate, stripHtml } from "./core/tools.js";
import { type CalendarEvent, buildIcs, isoDay, saveIcsFile } from "./ics.js";
import { activeCourses, pickCourseId, pickCourseIds, pickCourses } from "./courses.js";

type Api = HttpClient;

const courseId = z
  .union([z.string(), z.number()])
  .describe(
    "Canvas course ID, the number Canvas shows for the course, or the course name such as \"Networking 1\". Ask get_my_courses for the list of IDs and names.",
  );

/** Keep a section readable: at most 20 lines, then a note about the rest. */
function cap(lines: string[]): string[] {
  if (lines.length <= 20) return lines;
  return [...lines.slice(0, 20), `and ${lines.length - 20} more`];
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

/** True when the student does not have to hand this work in any more. */
function alreadySettled(s: any): boolean {
  if (!s) return false;
  if (s.excused) return true;
  if (s.score != null) return true;
  return ["submitted", "graded", "pending_review", "needs_grading", "needs_group_review"].includes(
    String(s.workflow_state),
  );
}

export const tools: ToolDef<Api>[] = [
  {
    name: "get_my_courses",
    title: "My courses",
    description:
      "List your active Canvas courses with their Canvas course IDs. Use a course ID or a course name in the other tools. Example: \"What are my Canvas courses this term?\"",
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
      "Assignments for one Canvas course. Pass course_id as the Canvas course ID or as the course name, for example \"Networking 1\", and get due dates, points and submission status: not submitted, submitted, graded, missing or excused. Set bucket to filter, for example overdue. Example: \"Which Canvas assignments in Networking 1 are overdue?\"",
    inputSchema: {
      course_id: courseId,
      bucket: z
        .enum(["upcoming", "future", "past", "overdue", "undated", "ungraded", "unsubmitted"])
        .optional()
        .describe("Optional filter, for example overdue or upcoming."),
    },
    run: async ({ course_id, bucket }, api) => {
      const picked = await pickCourseId(api, course_id);
      if ("message" in picked) return picked.message;
      const items = await api.getAll<any>(`/api/v1/courses/${picked.id}/assignments`, {
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
      "Your current grade in each active Canvas course from the Canvas gradebook, with the assignments behind each grade: your score, the points possible and the submission status. Pass course_id as the Canvas course ID or as the course name to limit the grades and the breakdown to one course. Example: \"What is my grade in each Canvas course and which assignments make it up?\"",
    inputSchema: {
      course_id: courseId.optional().describe("Optional, limit the grades and the breakdown to one course."),
    },
    run: async ({ course_id }, api) => {
      const courses = await activeCourses(api, { "include[]": ["total_scores"] });
      const picked = pickCourses(courses, course_id);
      if ("message" in picked) return picked.message;
      const shown = picked.courses;
      if (!shown.length) return "No grades found.";
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
      "Modules and module items for one Canvas course. Pass course_id as the Canvas course ID or as the course name. Example: \"Show me the Week 3 module in my Canvas Networking course.\"",
    inputSchema: { course_id: courseId },
    run: async ({ course_id }, api) => {
      const picked = await pickCourseId(api, course_id);
      if ("message" in picked) return picked.message;
      const modules = await api.getAll<any>(`/api/v1/courses/${picked.id}/modules`, { "include[]": ["items"], per_page: 50 });
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
      "The syllabus text for one Canvas course, with HTML removed. Pass course_id as the Canvas course ID or as the course name. Example: \"What does the Canvas syllabus say about grading in Scripting?\"",
    inputSchema: { course_id: courseId },
    run: async ({ course_id }, api) => {
      const picked = await pickCourseId(api, course_id);
      if ("message" in picked) return picked.message;
      const c = await api.get<any>(`/api/v1/courses/${picked.id}`, { "include[]": ["syllabus_body"] });
      return stripHtml(c.syllabus_body) || "This course has no syllabus posted.";
    },
  },
  {
    name: "get_announcements",
    title: "Announcements",
    description:
      "Recent Canvas announcements, either for the course_ids you pass or for all your active courses. Each course id can be the Canvas course ID or the course name. Example: \"What did my instructors announce in Canvas lately?\"",
    inputSchema: { course_ids: z.array(courseId).optional() },
    run: async ({ course_ids }, api) => {
      let ids: number[];
      if (course_ids?.length) {
        const picked = await pickCourseIds(api, course_ids);
        if ("message" in picked) return picked.message;
        ids = picked.ids;
      } else {
        ids = (await activeCourses(api)).map((c) => c.id);
      }
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
    name: "get_whats_new",
    title: "What's new",
    description:
      "One catch up across your Canvas courses: announcements posted in the last few days, assignments graded in that window and discussions that still have unread replies. Pass since_days to change the window, 7 by default, or course_id as the Canvas course ID or as the course name to check one course. Example: \"What's new in Canvas since last week?\"",
    inputSchema: {
      since_days: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe("How many days back to look for new announcements and newly graded work. Defaults to 7."),
      course_id: courseId.optional().describe("Optional, check one Canvas course only."),
    },
    run: async ({ since_days, course_id }, api) => {
      const days = since_days ?? 7;
      const cutoff = Date.now() - days * 86400000;
      const span = days === 1 ? "1 day" : `${days} days`;
      const courses = await activeCourses(api);
      const picked = pickCourses(courses, course_id);
      if ("message" in picked) return picked.message;
      const shown = picked.courses;
      if (!shown.length) return "No active courses found.";

      const annLines: string[] = [];
      try {
        const items = await api.getAll<any>("/api/v1/announcements", {
          "context_codes[]": shown.map((c) => `course_${c.id}`),
          active_only: true,
          per_page: 20,
        });
        for (const a of items) {
          if (a.posted_at && Date.parse(a.posted_at) < cutoff) continue;
          annLines.push(`${a.title} (${fmtDate(a.posted_at)})\n  ${stripHtml(a.message, 200).replace(/\n/g, " ")}`);
        }
      } catch {
        annLines.push("Canvas would not list the announcements for these courses.");
      }

      const gradeLines: string[] = [];
      for (const c of shown) {
        try {
          const items = await api.getAll<any>(`/api/v1/courses/${c.id}/assignments`, {
            "include[]": ["submission"],
            order_by: "due_at",
            per_page: 100,
          });
          for (const a of items) {
            const s = a.submission;
            if (!s || s.workflow_state !== "graded" || !s.graded_at) continue;
            if (Date.parse(s.graded_at) < cutoff) continue;
            const score = s.score != null ? `${s.score}/${a.points_possible ?? "?"}` : "graded";
            gradeLines.push(`${a.name}: ${score} in ${c.name} (${fmtDate(s.graded_at)})`);
          }
        } catch {
          gradeLines.push(`Canvas would not list the assignments for ${c.name}.`);
        }
      }

      const discLines: string[] = [];
      for (const c of shown) {
        try {
          const items = await api.getAll<any>(`/api/v1/courses/${c.id}/discussion_topics`, { per_page: 30 });
          for (const d of items) {
            if (!d.unread_count) continue;
            discLines.push(`${d.title} (${d.unread_count} unread in ${c.name}, posted ${fmtDate(d.posted_at)})`);
          }
        } catch {
          discLines.push(`Canvas would not list the discussions for ${c.name}.`);
        }
      }

      if (!annLines.length && !gradeLines.length && !discLines.length) {
        return `Nothing new in Canvas: no announcements or newly graded work in the last ${span}, and no unread discussion replies.`;
      }
      return [
        `New announcements (last ${span})\n${bullets(cap(annLines), "None.")}`,
        `Newly graded (last ${span})\n${bullets(cap(gradeLines), "None.")}`,
        `Unread discussion replies\n${bullets(cap(discLines), "None.")}`,
      ].join("\n\n");
    },
  },
  {
    name: "get_discussions",
    title: "Discussions",
    description:
      "Discussion topics for one Canvas course, with unread counts. Pass course_id as the Canvas course ID or as the course name. Example: \"What discussions are open in my Canvas Networking course?\"",
    inputSchema: { course_id: courseId },
    run: async ({ course_id }, api) => {
      const picked = await pickCourseId(api, course_id);
      if ("message" in picked) return picked.message;
      const items = await api.getAll<any>(`/api/v1/courses/${picked.id}/discussion_topics`, { per_page: 30 });
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
  {
    name: "export_due_dates_calendar",
    title: "Export due dates calendar",
    description:
      "Build an iCalendar (.ics) file of Canvas due dates and calendar events that opens in Google Calendar, Apple Calendar and Outlook. Give a folder in path and the file is saved there, or leave path out and the calendar text comes back so you can save it yourself. Each event carries the course name, the points, the submission status and a link back to Canvas, plus a reminder the day before. By default only work you still owe is in the file, set include_submitted to add the work you already handed in. Use days_ahead to change how far ahead to look, 30 days by default, or course_id as the Canvas course ID or as the course name for one course. Example: \"Put my Canvas due dates in Google Calendar.\"",
    inputSchema: {
      days_ahead: z
        .number()
        .int()
        .min(1)
        .max(120)
        .optional()
        .describe("How many days ahead to include. Defaults to 30."),
      course_id: courseId.optional().describe("Optional, only include one Canvas course."),
      include_submitted: z
        .boolean()
        .optional()
        .describe("Include the work you already submitted or graded. Defaults to false, so the file only has the work you still owe."),
      path: z
        .string()
        .optional()
        .describe("Folder to save the .ics file in, for example /Users/you/Documents. It is made if it is not there yet."),
      filename: z.string().optional().describe("Name for the saved file, for example fall.ics. Defaults to canvas-due-dates.ics."),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    run: async ({ days_ahead, course_id, include_submitted, path, filename }, api) => {
      const days = days_ahead ?? 30;
      const wantSubmitted = include_submitted === true;
      const now = new Date();
      const until = new Date(now.getTime() + days * 86400000);

      const courses = await activeCourses(api);
      const picked = pickCourses(courses, course_id);
      if ("message" in picked) return picked.message;
      const shown = picked.courses;
      if (!shown.length) return "No active courses found.";
      // The course events are filtered by id, so keep the ids the course names point at.
      const scope = course_id == null ? null : new Set(shown.map((c) => String(c.id)));

      const events: CalendarEvent[] = [];
      const assignmentIds = new Set<string>();
      const skipped: string[] = [];

      for (const c of shown) {
        let items: any[] = [];
        try {
          items = await api.getAll<any>(`/api/v1/courses/${c.id}/assignments`, {
            "include[]": ["submission"],
            order_by: "due_at",
            per_page: 100,
          });
        } catch {
          skipped.push(`the assignments for ${c.name ?? `course ${c.id}`}`);
          continue;
        }
        for (const a of items) {
          if (a.id != null) assignmentIds.add(String(a.id));
          const due = a.due_at ? new Date(a.due_at) : null;
          if (!due || Number.isNaN(due.getTime())) continue;
          if (due.getTime() < now.getTime() || due.getTime() > until.getTime()) continue;
          if (!wantSubmitted && alreadySettled(a.submission)) continue;
          const points = a.points_possible != null ? `${a.points_possible} points. ` : "";
          events.push({
            title: a.name ?? "Untitled",
            course: c.name,
            kind: "assignment",
            start: a.due_at,
            end: a.due_at,
            url: a.html_url ?? (a.id != null ? `${api.baseUrl}/courses/${c.id}/assignments/${a.id}` : null),
            note: `${points}Status: ${submissionLine(a)}.`,
            reminder: `${a.name ?? "Untitled"} is due tomorrow.`,
            key: `course-${c.id}-assignment-${a.id ?? a.name}`,
          });
        }
      }

      try {
        const calendar = await api.getAll<any>("/api/v1/calendar_events", {
          start_date: isoDay(now),
          end_date: isoDay(until),
          per_page: 100,
        });
        for (const e of calendar) {
          // A due date that belongs to an assignment is already in the file.
          if (e.assignment_id != null && assignmentIds.has(String(e.assignment_id))) continue;
          const context = e.context_id ?? String(e.context_code ?? "").replace(/^course_/, "");
          if (scope && !scope.has(String(context))) continue;
          const start = e.start_at ? new Date(e.start_at) : null;
          if (!start || Number.isNaN(start.getTime())) continue;
          if (start.getTime() < now.getTime() || start.getTime() > until.getTime()) continue;
          events.push({
            title: e.title ?? "Untitled",
            course: e.context_name ?? undefined,
            kind: "event",
            start: e.start_at,
            end: e.end_at,
            allDay: Boolean(e.all_day),
            url: e.html_url ?? (e.id != null ? `${api.baseUrl}/calendar/events/${e.id}` : null),
            note: "Canvas calendar event.",
            reminder: `${e.title ?? "Untitled"} is tomorrow.`,
            key: `course-${context}-event-${e.id ?? e.title}`,
          });
        }
      } catch {
        skipped.push("the Canvas calendar");
      }

      events.sort((a, b) => String(a.start ?? "").localeCompare(String(b.start ?? "")));

      if (!events.length) {
        return `No Canvas due dates in the next ${days} days${
          scope ? ` in ${shown[0]?.name ?? String(course_id)}` : ""
        }, so there is nothing to export.`;
      }

      const calendarName = course_id != null && shown.length === 1 ? `Canvas due dates: ${shown[0].name}` : "Canvas due dates";
      const text = buildIcs(events, { name: calendarName });

      const fileName = (filename ?? "").trim() || "canvas-due-dates.ics";
      if (!fileName.toLowerCase().endsWith(".ics")) {
        return `The file name has to end in .ics, for example canvas-due-dates.ics. You gave ${fileName}.`;
      }
      if (fileName.includes("/") || fileName.includes("\\")) {
        return `The file name has to be a plain name with no path in it. You gave ${fileName}.`;
      }

      if (!path) return text;

      let file: string;
      try {
        file = await saveIcsFile(path, fileName, text);
      } catch (err) {
        throw new Error(
          `Could not save ${fileName} in ${path}: ${(err as Error).message}. Check the folder path and that you can write to it.`,
        );
      }

      const rows = events.map(
        (e) => `- ${e.title}${e.course ? ` (${e.course})` : ""} ${e.kind === "event" ? "starts" : "due"} ${fmtDate(e.start)}`,
      );
      const listed = rows.length > 10 ? [...rows.slice(0, 10), `- and ${rows.length - 10} more`] : rows;
      const notes = skipped.map((s) => `Canvas would not list ${s}.`);
      return [
        `Saved ${events.length} Canvas due date${events.length === 1 ? "" : "s"} to ${file}`,
        listed.join("\n"),
        "Open the file or import it in Google Calendar, Apple Calendar or Outlook.",
        ...notes,
      ].join("\n");
    },
  },
];
