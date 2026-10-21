import type { HttpClient } from "./core/http.js";

/** A Canvas course as the student sees it. */
export interface Course {
  id: number;
  name?: string;
  course_code?: string;
  enrollments?: { type: string; computed_current_score?: number | null; computed_current_grade?: string | null }[];
}

/** The courses the student is signed up for, the same list get_my_courses shows. */
export async function activeCourses(api: HttpClient, extra: Record<string, string[]> = {}): Promise<Course[]> {
  const courses = await api.getAll<Course>("/api/v1/courses", {
    enrollment_state: "active",
    per_page: 100,
    ...extra,
  });
  return courses.filter((c) => c.name);
}

/** True when the value is a plain course id such as 12345. */
export function isCourseId(value: string | number): boolean {
  return /^\d+$/.test(String(value).trim());
}

/**
 * Fold a course name down to the words a person would say, so "my Networking 1 course"
 * still finds the course called "Networking 1".
 */
function courseWords(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:my|the|course|class)\s+/, "")
    .replace(/\s+(?:courses?|class(?:es)?)$/, "")
    .trim();
}

/**
 * Fold what someone asked for down to the same words. Course codes and ids in
 * brackets are dropped, because that is how get_my_courses prints a course.
 */
function searchWords(value: string): string {
  return courseWords(
    value
      .trim()
      .replace(/\s*\[id\s*\d+\]\s*$/i, "")
      .replace(/\s*\([^()]*\)\s*$/, "")
      .trim(),
  );
}

export type CourseMatch =
  /** One course was found. */
  | { kind: "course"; course: Course }
  /** The name fits more than one course, so the person has to say which one. */
  | { kind: "several"; courses: Course[] }
  /** Nothing in the list fits. */
  | { kind: "none" };

/**
 * Find the course a person means in a list of courses, by id, by name or by course code.
 */
export function matchCourse(courses: Course[], value: string | number): CourseMatch {
  const text = searchWords(String(value));
  if (!text) return { kind: "none" };

  const byId = courses.find((c) => String(c.id) === text);
  if (byId) return { kind: "course", course: byId };

  const byName = courses.find((c) => courseWords(c.name ?? "") === text);
  if (byName) return { kind: "course", course: byName };

  const byCode = courses.find((c) => courseWords(c.course_code ?? "") === text);
  if (byCode) return { kind: "course", course: byCode };

  const partial = courses.filter(
    (c) => courseWords(c.name ?? "").includes(text) || courseWords(c.course_code ?? "").includes(text),
  );
  if (partial.length === 1) return { kind: "course", course: partial[0] };
  if (partial.length > 1) return { kind: "several", courses: partial };
  return { kind: "none" };
}

/** Say that nothing matched and point at get_my_courses. */
export function noCourseMessage(value: string | number): string {
  if (isCourseId(value)) {
    return `No active Canvas course with id ${value}. Ask get_my_courses for the right id.`;
  }
  return `No Canvas course matches "${value}". Ask get_my_courses to see your course names and ids.`;
}

/** Say that a name fits more than one course and ask which one is meant. */
export function severalCoursesMessage(value: string | number, courses: Course[]): string {
  const list = courses.map((c) => `${c.name} (id ${c.id})`).join(", ");
  return `"${value}" matches more than one Canvas course: ${list}. Ask get_my_courses for the full list, then pass the id.`;
}

/** The courses a request is about, or a message that says why there are none. */
export type CoursePick = { courses: Course[] } | { message: string };

/**
 * Pick the courses a request is about. Without a course it means every active course.
 */
export function pickCourses(courses: Course[], value: string | number | undefined): CoursePick {
  if (value == null) return { courses };
  const match = matchCourse(courses, value);
  if (match.kind === "course") return { courses: [match.course] };
  if (match.kind === "several") return { message: severalCoursesMessage(value, match.courses) };
  return { message: noCourseMessage(value) };
}

/** A Canvas course id, or a message that says why there is none. */
export type CourseIdPick = { id: number } | { message: string };

/**
 * Turn what a person said into a Canvas course id. A plain number is used as it is.
 * A name is looked up in the active courses, the list get_my_courses shows.
 */
export async function pickCourseId(api: HttpClient, value: string | number): Promise<CourseIdPick> {
  if (isCourseId(value)) return { id: Number(String(value).trim()) };
  const courses = await activeCourses(api);
  const match = matchCourse(courses, value);
  if (match.kind === "course") return { id: match.course.id };
  if (match.kind === "several") return { message: severalCoursesMessage(value, match.courses) };
  return { message: noCourseMessage(value) };
}

/** Several Canvas course ids, or a message that says why there are none. */
export type CourseIdsPick = { ids: number[] } | { message: string };

/**
 * Turn a list of course names or ids into Canvas course ids.
 */
export async function pickCourseIds(api: HttpClient, values: (string | number)[]): Promise<CourseIdsPick> {
  const ids: number[] = [];
  let courses: Course[] | null = null;
  for (const value of values) {
    if (isCourseId(value)) {
      ids.push(Number(String(value).trim()));
      continue;
    }
    courses ??= await activeCourses(api);
    const match = matchCourse(courses, value);
    if (match.kind === "course") {
      ids.push(match.course.id);
      continue;
    }
    if (match.kind === "several") return { message: severalCoursesMessage(value, match.courses) };
    return { message: noCourseMessage(value) };
  }
  return { ids };
}
