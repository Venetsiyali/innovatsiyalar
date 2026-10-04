"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { effectiveScore } from "@/lib/assignment-rules";
import { canManageCourse } from "@/lib/course-access";
import { dayOfWeek, isoDate, parseDate, todayDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notify";
import type { FormState } from "@/lib/form";
import { t } from "@/lib/i18n";

const live = { deletedAt: null };

/** Bulk-save gradebook cells named `g:<assignmentId>:<studentId>`; only changed cells are written. */
export async function saveGradebookAction(courseId: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user || !(await canManageCourse(session.user, courseId))) return { error: t("errors.forbidden") };

  const entries = [...fd.entries()]
    .filter(([k]) => k.startsWith("g:"))
    .map(([k, v]) => {
      const [, assignmentId, studentId] = k.split(":");
      return { assignmentId, studentId, value: String(v).trim().replace(",", ".") };
    })
    .filter((e) => e.value !== "");
  if (!entries.length) return { error: t("gradebook.noChanges") };

  const assignments = await db.assignment.findMany({
    where: { id: { in: [...new Set(entries.map((e) => e.assignmentId))] }, courseId, ...live },
    include: { groups: { where: live, select: { groupId: true } } },
  });
  const byId = new Map(assignments.map((a) => [a.id, a]));
  const existing = await db.submission.findMany({
    where: { assignmentId: { in: assignments.map((a) => a.id) }, ...live },
    include: { grade: true, student: { select: { fullName: true } } },
  });
  const subKey = (a: string, s: string) => `${a}|${s}`;
  const subs = new Map(existing.map((s) => [subKey(s.assignmentId, s.studentId), s]));

  let count = 0;
  for (const e of entries) {
    const a = byId.get(e.assignmentId);
    if (!a) continue;
    const score = Number(e.value);
    const sub = subs.get(subKey(a.id, e.studentId));
    if (sub?.grade && sub.grade.score === score) continue; // unchanged
    // The student must be enrolled in one of the assignment's groups.
    const enrolled = await db.enrollment.count({
      where: { userId: e.studentId, ...live, status: "ACTIVE", groupId: { in: a.groups.map((g) => g.groupId) } },
    });
    if (!enrolled) continue;
    if (!Number.isFinite(score) || score < 0 || score > a.maxScore) {
      const name = sub?.student.fullName ?? (await db.user.findUnique({ where: { id: e.studentId } }))?.fullName ?? "";
      return { error: t("gradebook.badCell", { student: name, max: a.maxScore }) };
    }
    // No submission yet (e.g. an oral answer or a zero for not submitting): create an empty one.
    const submission =
      sub ?? (await db.submission.create({ data: { assignmentId: a.id, studentId: e.studentId, submittedAt: new Date(), isLate: false } }));
    const grade = await db.grade.upsert({
      where: { submissionId: submission.id },
      update: { score, gradedById: session.user.id, gradedAt: new Date(), deletedAt: null },
      create: { submissionId: submission.id, score, gradedById: session.user.id },
    });
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "grade.set",
        entity: "Grade",
        entityId: grade.id,
        oldValue: sub?.grade ? { score: sub.grade.score } : undefined,
        newValue: { score, via: "gradebook" },
      },
    });
    await notifyUsers([{
        userId: e.studentId,
        type: "grade",
        message: t("assignments.gradedNotice", { title: a.title, score: effectiveScore(score, submission.isLate, a.latePenaltyPct), max: a.maxScore }),
        link: "/student/grades",
      }]);
    count++;
  }
  revalidatePath("/teacher/gradebook", "layout");
  revalidatePath("/admin/courses", "layout");
  return count ? { success: t("gradebook.saved", { count }) } : { error: t("gradebook.noChanges") };
}

const ABSENCE_ALERT = 3; // TZ 4.7: more than 3 unexcused absences → signal to admin

/** Mark attendance for one occurrence of a timetable slot. */
export async function saveAttendanceAction(slotId: string, dateIso: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: t("errors.forbidden") };
  const slot = await db.scheduleSlot.findFirst({ where: { id: slotId, ...live }, include: { group: true } });
  if (!slot) return { error: t("common.notFound") };
  const allowed = slot.teacherId === session.user.id || (await canManageCourse(session.user, slot.courseId));
  if (!allowed) return { error: t("errors.forbidden") };

  const date = parseDate(dateIso);
  if (!date || dayOfWeek(date) !== slot.dayOfWeek) return { error: t("attendance.wrongDay") };
  if (date > todayDate()) return { error: t("attendance.future") };
  if (await db.scheduleChange.count({ where: { slotId, date, type: "CANCELLED", ...live } })) return { error: t("attendance.cancelledLesson") };

  const students = await db.enrollment.findMany({
    where: { groupId: slot.groupId, ...live, status: "ACTIVE", user: { ...live, role: "STUDENT" } },
    select: { userId: true, user: { select: { fullName: true } } },
  });
  const newlyAbsent: { id: string; name: string }[] = [];
  for (const { userId, user } of students) {
    const raw = String(fd.get(`s:${userId}`) ?? "PRESENT");
    const status = raw === "ABSENT" || raw === "EXCUSED" ? raw : "PRESENT";
    const prev = await db.attendance.findUnique({ where: { slotId_studentId_date: { slotId, studentId: userId, date } } });
    await db.attendance.upsert({
      where: { slotId_studentId_date: { slotId, studentId: userId, date } },
      update: { status, deletedAt: null },
      create: { slotId, studentId: userId, date, status },
    });
    if (status === "ABSENT" && prev?.status !== "ABSENT") newlyAbsent.push({ id: userId, name: user.fullName });
  }

  // Signal admins exactly once, when a student crosses the threshold.
  if (newlyAbsent.length) {
    const admins = await db.user.findMany({ where: { role: "ADMIN", ...live, isActive: true }, select: { id: true } });
    for (const s of newlyAbsent) {
      const count = await db.attendance.count({ where: { studentId: s.id, status: "ABSENT", ...live, slot: { semesterId: slot.semesterId } } });
      if (count === ABSENCE_ALERT + 1) {
        await notifyUsers(admins.map((a) => ({
            userId: a.id,
            type: "attendance_alert",
            message: t("attendance.alert", { student: s.name, group: slot.group.name, count }),
            link: "/admin/reports",
          })));
      }
    }
  }
  revalidatePath("/teacher/attendance", "layout");
  return { success: t("attendance.saved", { count: students.length }), data: isoDate(date) };
}
