/** The parts of a Canvas assignment the grade math needs. */
export interface GradeItem {
  points_possible?: number | null;
  /** Canvas leaves this work out of the course grade. */
  omit_from_final_grade?: boolean | null;
  /** An assignment set to not graded does not count toward the course grade. */
  grading_type?: string | null;
  submission?: {
    score?: number | null;
    excused?: boolean | null;
  } | null;
}

/** Points already scored and points still to come, for one course. */
export interface GradePoints {
  /** Points scored on work Canvas has graded. */
  earnedPoints: number;
  /** Points possible on work Canvas has graded. */
  gradedPoints: number;
  /** Points possible on work Canvas has not graded yet. */
  remainingPoints: number;
  /** How many assignments Canvas has graded. */
  gradedItems: number;
  /** How many assignments Canvas has not graded yet. */
  remainingItems: number;
}

/**
 * Add up the points behind a course grade. Excused work, work Canvas keeps out
 * of the final grade and assignments that carry no points are left out, because
 * none of them can change the course percent.
 */
export function gradePoints(items: GradeItem[]): GradePoints {
  let earnedPoints = 0;
  let gradedPoints = 0;
  let remainingPoints = 0;
  let gradedItems = 0;
  let remainingItems = 0;

  for (const item of items) {
    if (item.omit_from_final_grade) continue;
    if (item.grading_type === "not_graded") continue;
    if (item.submission?.excused) continue;

    const possible = Number(item.points_possible);
    if (!Number.isFinite(possible) || possible <= 0) continue;

    const score = item.submission?.score;
    if (score != null && Number.isFinite(Number(score))) {
      earnedPoints += Number(score);
      gradedPoints += possible;
      gradedItems += 1;
    } else {
      remainingPoints += possible;
      remainingItems += 1;
    }
  }

  return { earnedPoints, gradedPoints, remainingPoints, gradedItems, remainingItems };
}

/** The answer for one course and one target percent. */
export interface TargetGradeResult extends GradePoints {
  /** The course percent used for the work already graded, or null when none is graded. */
  currentPercent: number | null;
  targetPercent: number;
  /**
   * Points still needed on the work left. It is below 0 when the target is
   * already held, because even a 0 on the work left keeps it.
   */
  neededPoints: number;
  /** Percent needed on the work left, or null when no work is left. */
  neededPercent: number | null;
  /** True when a 0 on the work left still reaches the target. */
  alreadyThere: boolean;
  /** True when the work left is enough to reach the target. */
  possible: boolean;
  /** The best final percent, if every point left is earned. */
  bestPercent: number | null;
  /** The final percent if no point left is earned. */
  worstPercent: number | null;
}

/**
 * Work out what the work left has to score to reach a target percent.
 *
 * The percent Canvas reports for the graded work is used when it is passed in.
 * Canvas can weight assignment groups or drop the lowest score, so the points
 * alone do not always give the same percent. When no current percent is passed,
 * the graded points are used on their own.
 */
export function targetGrade(
  points: GradePoints,
  targetPercent: number,
  currentPercent?: number | null,
): TargetGradeResult {
  if (!Number.isFinite(targetPercent) || targetPercent < 0 || targetPercent > 100) {
    throw new Error("The target percent has to be between 0 and 100.");
  }
  if (currentPercent != null && (!Number.isFinite(currentPercent) || currentPercent < 0 || currentPercent > 100)) {
    throw new Error("The current percent has to be between 0 and 100.");
  }

  const { earnedPoints, gradedPoints, remainingPoints } = points;
  const current =
    currentPercent != null
      ? currentPercent
      : gradedPoints > 0
        ? (earnedPoints / gradedPoints) * 100
        : null;

  const totalPoints = gradedPoints + remainingPoints;
  if (totalPoints <= 0) {
    return {
      ...points,
      currentPercent: null,
      targetPercent,
      neededPoints: 0,
      neededPercent: null,
      alreadyThere: false,
      possible: false,
      bestPercent: null,
      worstPercent: null,
    };
  }

  // Points the current percent is worth out of the graded work. Keeping them as
  // points lets the work left be added alongside them.
  const bankedPoints = current == null ? 0 : (current / 100) * gradedPoints;
  const targetPoints = (targetPercent / 100) * totalPoints;
  const neededPoints = targetPoints - bankedPoints;
  const alreadyThere = neededPoints <= 0;
  const neededPercent = remainingPoints > 0 ? (neededPoints / remainingPoints) * 100 : null;

  return {
    ...points,
    currentPercent: current,
    targetPercent,
    neededPoints,
    neededPercent,
    alreadyThere,
    possible: alreadyThere || (neededPercent != null && neededPercent <= 100),
    bestPercent: ((bankedPoints + remainingPoints) / totalPoints) * 100,
    worstPercent: (bankedPoints / totalPoints) * 100,
  };
}
