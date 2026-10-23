import { describe, it, expect } from "vitest";
import { gradePoints, targetGrade, type GradeItem } from "../src/grades.js";

const items: GradeItem[] = [
  { points_possible: 10, submission: { score: 8 } },
  { points_possible: 20, submission: { score: 20 } },
  { points_possible: 30, submission: { score: null } },
  { points_possible: 10, submission: {} },
  { points_possible: 100, submission: { score: 100, excused: true } },
  { points_possible: 50, omit_from_final_grade: true, submission: { score: 50 } },
  { points_possible: 40, grading_type: "not_graded", submission: { score: 40 } },
  { points_possible: 0, submission: { score: 0 } },
  { points_possible: null, submission: { score: 5 } },
];

describe("grade points", () => {
  it("adds up graded and ungraded points", () => {
    expect(gradePoints(items)).toEqual({
      earnedPoints: 28,
      gradedPoints: 30,
      remainingPoints: 40,
      gradedItems: 2,
      remainingItems: 2,
    });
  });

  it("leaves out work that cannot change the course grade", () => {
    const points = gradePoints(items);
    // 100 excused, 50 omitted, 40 not graded and 0 points are all left out.
    expect(points.gradedPoints + points.remainingPoints).toBe(70);
  });

  it("keeps a score of zero as graded work", () => {
    const points = gradePoints([{ points_possible: 10, submission: { score: 0 } }]);
    expect(points.earnedPoints).toBe(0);
    expect(points.gradedPoints).toBe(10);
    expect(points.remainingPoints).toBe(0);
  });

  it("treats work with no submission or no score as work left", () => {
    const points = gradePoints([
      { points_possible: 5 },
      { points_possible: 5, submission: null },
      { points_possible: 5, submission: { score: null } },
    ]);
    expect(points.remainingPoints).toBe(15);
    expect(points.remainingItems).toBe(3);
  });

  it("has nothing to add up for an empty course", () => {
    expect(gradePoints([])).toEqual({
      earnedPoints: 0,
      gradedPoints: 0,
      remainingPoints: 0,
      gradedItems: 0,
      remainingItems: 0,
    });
  });
});

describe("target grade", () => {
  it("works out the points and percent needed on the work left", () => {
    const result = targetGrade(
      { earnedPoints: 70, gradedPoints: 100, remainingPoints: 100, gradedItems: 2, remainingItems: 2 },
      80,
    );
    expect(result.currentPercent).toBe(70);
    expect(result.neededPoints).toBe(90);
    expect(result.neededPercent).toBe(90);
    expect(result.alreadyThere).toBe(false);
    expect(result.possible).toBe(true);
    expect(result.bestPercent).toBe(85);
    expect(result.worstPercent).toBe(35);
  });

  it("says when a 0 on the work left still reaches the target", () => {
    const result = targetGrade(
      { earnedPoints: 90, gradedPoints: 100, remainingPoints: 100, gradedItems: 1, remainingItems: 1 },
      40,
    );
    expect(result.neededPoints).toBe(-10);
    expect(result.neededPercent).toBe(-10);
    expect(result.alreadyThere).toBe(true);
    expect(result.possible).toBe(true);
    expect(result.bestPercent).toBe(95);
    expect(result.worstPercent).toBe(45);
  });

  it("says when the target is out of reach and gives the best finish", () => {
    const result = targetGrade(
      { earnedPoints: 40, gradedPoints: 100, remainingPoints: 100, gradedItems: 1, remainingItems: 1 },
      90,
    );
    expect(result.neededPoints).toBe(140);
    expect(result.neededPercent).toBe(140);
    expect(result.alreadyThere).toBe(false);
    expect(result.possible).toBe(false);
    expect(result.bestPercent).toBe(70);
    expect(result.worstPercent).toBe(20);
  });

  it("uses the percent Canvas reports when one is passed", () => {
    // Canvas can weight groups or drop the lowest score, so 45 points out of 50
    // can still be an 80 percent in the gradebook.
    const result = targetGrade(
      { earnedPoints: 45, gradedPoints: 50, remainingPoints: 50, gradedItems: 1, remainingItems: 1 },
      90,
      80,
    );
    expect(result.currentPercent).toBe(80);
    expect(result.neededPoints).toBe(50);
    expect(result.neededPercent).toBe(100);
    expect(result.alreadyThere).toBe(false);
    expect(result.possible).toBe(true);
    expect(result.bestPercent).toBe(90);
    expect(result.worstPercent).toBe(40);
  });

  it("says a target above the current percent is out of reach when no work is left", () => {
    const result = targetGrade(
      { earnedPoints: 88, gradedPoints: 100, remainingPoints: 0, gradedItems: 4, remainingItems: 0 },
      90,
    );
    expect(result.currentPercent).toBe(88);
    expect(result.neededPoints).toBe(2);
    expect(result.neededPercent).toBeNull();
    expect(result.alreadyThere).toBe(false);
    expect(result.possible).toBe(false);
    expect(result.bestPercent).toBe(88);
    expect(result.worstPercent).toBe(88);
  });

  it("says the target is held when no work is left and the percent is above it", () => {
    const result = targetGrade(
      { earnedPoints: 88, gradedPoints: 100, remainingPoints: 0, gradedItems: 4, remainingItems: 0 },
      85,
    );
    expect(result.neededPoints).toBe(-3);
    expect(result.neededPercent).toBeNull();
    expect(result.alreadyThere).toBe(true);
    expect(result.possible).toBe(true);
  });

  it("has no answer for a course with no points at all", () => {
    const result = targetGrade(
      { earnedPoints: 0, gradedPoints: 0, remainingPoints: 0, gradedItems: 0, remainingItems: 0 },
      80,
    );
    expect(result.currentPercent).toBeNull();
    expect(result.neededPoints).toBe(0);
    expect(result.neededPercent).toBeNull();
    expect(result.alreadyThere).toBe(false);
    expect(result.possible).toBe(false);
    expect(result.bestPercent).toBeNull();
    expect(result.worstPercent).toBeNull();
  });

  it("starts from zero when nothing has been graded yet", () => {
    const result = targetGrade(
      { earnedPoints: 0, gradedPoints: 0, remainingPoints: 50, gradedItems: 0, remainingItems: 1 },
      80,
    );
    expect(result.currentPercent).toBeNull();
    expect(result.neededPoints).toBe(40);
    expect(result.neededPercent).toBe(80);
    expect(result.alreadyThere).toBe(false);
    expect(result.possible).toBe(true);
    expect(result.bestPercent).toBe(100);
    expect(result.worstPercent).toBe(0);
  });

  it("keeps a target of zero reachable with any score", () => {
    const result = targetGrade(
      { earnedPoints: 10, gradedPoints: 100, remainingPoints: 10, gradedItems: 1, remainingItems: 1 },
      0,
    );
    expect(result.neededPoints).toBe(-10);
    expect(result.alreadyThere).toBe(true);
    expect(result.possible).toBe(true);
  });

  it("keeps the decimal places it is given", () => {
    const result = targetGrade(
      { earnedPoints: 45, gradedPoints: 60, remainingPoints: 30, gradedItems: 3, remainingItems: 2 },
      89.5,
    );
    expect(result.currentPercent).toBeCloseTo(75);
    expect(result.neededPercent).toBeCloseTo(118.5);
    expect(result.possible).toBe(false);
    expect(result.bestPercent).toBeCloseTo(83.333, 3);
  });

  it("rejects percents outside 0 to 100", () => {
    const points = { earnedPoints: 10, gradedPoints: 20, remainingPoints: 20, gradedItems: 1, remainingItems: 1 };
    expect(() => targetGrade(points, -1)).toThrow("between 0 and 100");
    expect(() => targetGrade(points, 101)).toThrow("between 0 and 100");
    expect(() => targetGrade(points, Number.NaN)).toThrow("between 0 and 100");
    expect(() => targetGrade(points, 80, -1)).toThrow("current percent");
    expect(() => targetGrade(points, 80, 101)).toThrow("current percent");
  });
});
