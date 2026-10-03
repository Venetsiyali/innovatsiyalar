import "server-only";
import type { GradeCategory } from "@prisma/client";
import { effectiveScore } from "@/lib/assignment-rules";
import { db } from "@/lib/db";

const live = { deletedAt: null };
export const CATEGORIES: GradeCategory[] = ["CURRENT", "MIDTERM", "FINAL"];

export type Cell = { raw: number; effective: number; late: boolean; submitted: boolean } | null;

export type StudentRow = {
  id: string;
  fullName: string;
  group: string;
  cells: Record<string, Cell>; // by assignmentId
  categoryPct: Partial<Record<GradeCategory, number>>; // 0–100 within each category
  total: number | null; // 0–100, weighted
  attendancePct: number | null;
  absences: number; // unexcused
};

/**
 * Gradebook for a course (TZ 4.6): per category the share of points earned, then a weighted
 * 100-point total. Categories without any assignment yet are left out and weights re-normalised,
 * so the running total is meaningful during the semester.
 */
export async function computeGradebook(courseId: string, opts: { groupId?: string; studentId?: string } = {}) {
  const course = await db.course.findFirstOrThrow({ where: { id: courseId, ...live } });
  const groupFilter = opts.groupId ? { groupId: opts.groupId } : {};

  const [assignments, students, attendance] = await Promise.all([
    db.assignment.findMany({
      where: { courseId, ...live, ...(opts.groupId && { groups: { some: { groupId: opts.groupId, ...live } } }) },
      orderBy: [{ category: "asc" }, { deadline: "asc" }],
      include: { groups: { where: live, select: { groupId: true } }, submissions: { where: live, include: { grade: true } } },
    }),
    db.user.findMany({
      where: {
        ...live,
        role: "STUDENT",
        ...(opts.studentId && { id: opts.studentId }),
        enrollments: { some: { ...live, status: "ACTIVE", ...groupFilter, group: { ...live, courseGroups: { some: { courseId, ...live } } } } },
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        enrollments: { where: { ...live, ...groupFilter, group: { courseGroups: { some: { courseId, ...live } } } }, select: { groupId: true, group: { select: { name: true } } } },
      },
    }),
    db.attendance.groupBy({
      by: ["studentId", "status"],
      where: { ...live, slot: { courseId }, ...(opts.studentId && { studentId: opts.studentId }) },
      _count: true,
    }),
  ]);

  const weights: Record<GradeCategory, number> = {
    CURRENT: course.weightCurrent,
    MIDTERM: course.weightMidterm,
    FINAL: course.weightFinal,
  };

  const rows: StudentRow[] = students.map((s) => {
    const groupIds = new Set(s.enrollments.map((e) => e.groupId));
    const cells: Record<string, Cell> = {};
    const earned: Partial<Record<GradeCategory, { got: number; max: number }>> = {};
    for (const a of assignments) {
      // Only assignments given to this student's group count towards their total.
      if (!a.groups.some((g) => groupIds.has(g.groupId))) continue;
      const sub = a.submissions.find((x) => x.studentId === s.id);
      const cell: Cell = sub?.grade
        ? { raw: sub.grade.score, effective: effectiveScore(sub.grade.score, sub.isLate, a.latePenaltyPct), late: sub.isLate, submitted: !!(sub.text || sub.fileUrl) }
        : null;
      cells[a.id] = cell;
      const acc = (earned[a.category] ??= { got: 0, max: 0 });
      acc.max += a.maxScore;
      acc.got += cell?.effective ?? 0;
    }
    const categoryPct: StudentRow["categoryPct"] = {};
    let weighted = 0;
    let usedWeight = 0;
    for (const c of CATEGORIES) {
      const e = earned[c];
      if (!e || e.max === 0) continue;
      categoryPct[c] = Math.round((e.got / e.max) * 1000) / 10;
      weighted += (e.got / e.max) * weights[c];
      usedWeight += weights[c];
    }
    const counts = attendance.filter((x) => x.studentId === s.id);
    const all = counts.reduce((n, x) => n + x._count, 0);
    const absences = counts.find((x) => x.status === "ABSENT")?._count ?? 0;
    return {
      id: s.id,
      fullName: s.fullName,
      group: s.enrollments.map((e) => e.group.name).join(", "),
      cells,
      categoryPct,
      total: usedWeight ? Math.round((weighted / usedWeight) * 1000) / 10 : null,
      attendancePct: all ? Math.round(((all - absences) / all) * 1000) / 10 : null,
      absences,
    };
  });

  return { course, assignments, rows, weights };
}
