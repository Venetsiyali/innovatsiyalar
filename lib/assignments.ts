import "server-only";
import type { Prisma } from "@prisma/client";
import { submissionWindow } from "@/lib/assignment-rules";
import { db } from "@/lib/db";

const live = { deletedAt: null };

/** Assignments a student can see: assigned to one of their active groups and already started. */
export function studentAssignmentsWhere(userId: string, now = new Date()): Prisma.AssignmentWhereInput {
  return {
    ...live,
    startsAt: { lte: now },
    course: live,
    groups: { some: { ...live, group: { ...live, enrollments: { some: { userId, ...live, status: "ACTIVE" } } } } },
  };
}

/** The assignment if this student may submit to it right now, else null. */
export async function assignmentOpenForStudent(userId: string, assignmentId: string) {
  const a = await db.assignment.findFirst({ where: { id: assignmentId, ...studentAssignmentsWhere(userId) } });
  if (!a) return null;
  const w = submissionWindow(a);
  if (w.state !== "open") return null;
  // A graded submission is final.
  const graded = await db.submission.findFirst({ where: { assignmentId, studentId: userId, ...live, grade: { isNot: null } } });
  return graded ? null : { assignment: a, late: w.late };
}

/** Active students of the groups an assignment is given to. */
export async function assignmentStudents(assignmentId: string) {
  return db.user.findMany({
    where: {
      ...live,
      role: "STUDENT",
      enrollments: { some: { ...live, status: "ACTIVE", group: { ...live, assignments: { some: { assignmentId, ...live } } } } },
    },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, enrollments: { where: live, select: { group: { select: { name: true } } } } },
  });
}
