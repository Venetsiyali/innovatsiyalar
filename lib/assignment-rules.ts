// Client-safe assignment rules (deadline window, late penalty).

const DAY_MS = 86_400_000;

type WindowInput = { startsAt: Date; deadline: Date; allowLate: boolean; lateDays: number };

export type SubmissionWindow =
  | { state: "notStarted" }
  | { state: "open"; late: false }
  | { state: "open"; late: true; closesAt: Date }
  | { state: "closed" };

/** TZ 4.5: after the deadline, uploads are blocked unless late submission is allowed (for N days). */
export function submissionWindow(a: WindowInput, now = new Date()): SubmissionWindow {
  if (now < a.startsAt) return { state: "notStarted" };
  if (now <= a.deadline) return { state: "open", late: false };
  const closesAt = new Date(a.deadline.getTime() + a.lateDays * DAY_MS);
  if (a.allowLate && now <= closesAt) return { state: "open", late: true, closesAt };
  return { state: "closed" };
}

/** Score after the late penalty, rounded to 2 decimals. */
export function effectiveScore(score: number, isLate: boolean, latePenaltyPct: number): number {
  const v = isLate ? (score * (100 - latePenaltyPct)) / 100 : score;
  return Math.round(v * 100) / 100;
}

export function submissionPrefix(courseId: string, assignmentId: string, studentId: string): string {
  return `courses/${courseId}/submissions/${assignmentId}/${studentId}/`;
}

export function attachmentPrefix(courseId: string): string {
  return `courses/${courseId}/assignments/`;
}
