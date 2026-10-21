import { describe, it, expect } from "vitest";
import { isCourseId, matchCourse, noCourseMessage, pickCourses, severalCoursesMessage } from "../src/courses.js";

const courses = [
  { id: 1, name: "Networking 1", course_code: "NET1" },
  { id: 2, name: "Scripting", course_code: "SCR2" },
  { id: 3, name: "History 101", course_code: "HIS101" },
  { id: 4, name: "Networking 2", course_code: "NET2" },
];

describe("course names", () => {
  it("tells a course id from a course name", () => {
    expect(isCourseId(12)).toBe(true);
    expect(isCourseId("12")).toBe(true);
    expect(isCourseId("Networking 1")).toBe(false);
    expect(isCourseId("")).toBe(false);
  });

  it("finds a course by id, by name, by course code and by part of the name", () => {
    expect(matchCourse(courses, 2)).toEqual({ kind: "course", course: courses[1] });
    expect(matchCourse(courses, "Scripting")).toEqual({ kind: "course", course: courses[1] });
    expect(matchCourse(courses, "networking 1")).toEqual({ kind: "course", course: courses[0] });
    expect(matchCourse(courses, "HIS101")).toEqual({ kind: "course", course: courses[2] });
    expect(matchCourse(courses, "my Scripting class")).toEqual({ kind: "course", course: courses[1] });
    expect(matchCourse(courses, "the Scripting course")).toEqual({ kind: "course", course: courses[1] });
    expect(matchCourse(courses, "Networking 1 course")).toEqual({ kind: "course", course: courses[0] });
    expect(matchCourse(courses, "Networking 1 (NET1)")).toEqual({ kind: "course", course: courses[0] });
    expect(matchCourse(courses, "Networking 1 [id 1]")).toEqual({ kind: "course", course: courses[0] });
    expect(matchCourse(courses, "istor")).toEqual({ kind: "course", course: courses[2] });
    expect(matchCourse(courses, "script")).toEqual({ kind: "course", course: courses[1] });
  });

  it("says when a name fits more than one course", () => {
    const match = matchCourse(courses, "Networking");
    expect(match.kind).toBe("several");
    if (match.kind !== "several") return;
    expect(match.courses.map((c) => c.id)).toEqual([1, 4]);
  });

  it("says when nothing fits", () => {
    expect(matchCourse(courses, "Chemistry 101").kind).toBe("none");
    expect(matchCourse(courses, "").kind).toBe("none");
  });

  it("points every course that is not there at get_my_courses", () => {
    expect(noCourseMessage("Chemistry 101")).toContain("get_my_courses");
    expect(noCourseMessage("Chemistry 101")).toContain("Chemistry 101");
    expect(noCourseMessage(55)).toContain("get_my_courses");
    expect(noCourseMessage(55)).toContain("55");
    expect(severalCoursesMessage("Networking", courses.slice(0, 2))).toContain("get_my_courses");
  });

  it("keeps every course when no course is named", () => {
    expect(pickCourses(courses, undefined)).toEqual({ courses });
  });

  it("keeps the one course that was named", () => {
    expect(pickCourses(courses, "Scripting")).toEqual({ courses: [courses[1]] });
  });

  it("explains a course that is not there", () => {
    const picked = pickCourses(courses, "Chemistry 101");
    expect("message" in picked).toBe(true);
    if (!("message" in picked)) return;
    expect(picked.message).toContain("get_my_courses");
  });
});
