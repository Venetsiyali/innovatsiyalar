"use server";

import type { GradeCategory, SubmissionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { attachmentPrefix, effectiveScore, submissionPrefix } from "@/lib/assignment-rules";
import { assignmentOpenForStudent, assignmentStudents } from "@/lib/assignments";
import { canManageCourse } from "@/lib/course-access";
import { formatDateTime, parseLocalDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notify";
import { checkFile, extOf } from "@/lib/files";
import { int, optStr, str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { keyOf, storedSize } from "@/lib/storage";

async function requireManager(courseId: string) {
  const session = await auth();
  if (!session?.user || !(await canManageCourse(session.user, courseId))) throw new Error(t("errors.forbidden"));
  return session;
}

function refresh() {
  for (const p of ["/teacher", "/student", "/admin/courses"]) revalidatePath(p, "layout");
}

/** A stored file the caller claims to have uploaded: must be under `prefix` and exist. */
async function verifyUpload(url: string, prefix: string): Promise<string | null> {
  if (!keyOf(url).startsWith(prefix)) return t("errors.forbidden");
  const size = await storedSize(url);
  if (size == null) return t("content.fileMissing");
  const problem = checkFile(`x.${extOf(keyOf(url))}`, size);
  return problem ? t(problem) : null;
}

// ── Teacher: create / edit ──

export async function saveAssignmentAction(courseId: string, id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await requireManager(courseId);
  const startsAt = parseLocalDateTime(str(fd, "startsAt"));
  const deadline = parseLocalDateTime(str(fd, "deadline"));
  const title = str(fd, "title");
  const maxScore = int(fd, "maxScore");
  if (!title || !startsAt || !deadline || maxScore <= 0) return { error: t("common.required") };
  if (deadline <= startsAt) return { error: t("assignments.badDates") };

  // Only groups that actually study this course.
  const courseGroups = await db.courseGroup.findMany({ where: { courseId, deletedAt: null }, select: { groupId: true } });
  const allowedGroups = new Set(courseGroups.map((g) => g.groupId));
  const groupIds = fd.getAll("groupIds").map(String).filter((g) => allowedGroups.has(g));
  if (!groupIds.length) return { error: t("assignments.noGroups") };

  const attachmentUrl = optStr(fd, "attachmentUrl");
  if (attachmentUrl) {
    const err = await verifyUpload(attachmentUrl, attachmentPrefix(courseId));
    if (err) return { error: err };
  }
  const moduleId = optStr(fd, "moduleId");
  if (moduleId && !(await db.module.count({ where: { id: moduleId, courseId, deletedAt: null } }))) return { error: t("errors.forbidden") };

  const allowLate = fd.get("allowLate") === "on";
  const data = {
    title,
    description: optStr(fd, "description"),
    attachmentUrl,
    moduleId,
    maxScore,
    category: str(fd, "category") as GradeCategory,
    startsAt,
    deadline,
    allowLate,
    lateDays: allowLate ? Math.max(0, int(fd, "lateDays")) : 0,
    latePenaltyPct: allowLate ? Math.min(100, Math.max(0, int(fd, "latePenaltyPct"))) : 0,
    submissionType: str(fd, "submissionType") as SubmissionType,
  };

  const assignment = await db.$transaction(async (tx) => {
    const a = id
      ? await tx.assignment.update({ where: { id, courseId }, data })
      : await tx.assignment.create({ data: { ...data, courseId } });
    await tx.assignmentGroup.updateMany({ where: { assignmentId: a.id, groupId: { notIn: groupIds } }, data: { deletedAt: new Date() } });
    for (const groupId of groupIds) {
      await tx.assignmentGroup.upsert({
        where: { assignmentId_groupId: { assignmentId: a.id, groupId } },
        update: { deletedAt: null },
        create: { assignmentId: a.id, groupId },
      });
    }
    return a;
  });
  await db.auditLog.create({
    data: { userId: session.user.id, action: id ? "assignment.update" : "assignment.create", entity: "Assignment", entityId: assignment.id },
  });

  refresh();
  if (id) return { success: t("common.saved") };

  // TZ 4.8: notify students about a new assignment (email arrives in stage 6).
  const students = await assignmentStudents(assignment.id);
  await notifyUsers(students.map((s) => ({
      userId: s.id,
      type: "assignment_new",
      message: t("assignments.newNotice", { title, date: formatDateTime(deadline) }),
      link: `/student/assignments/${assignment.id}`,
    })));
  redirect(`/teacher/assignments/${assignment.id}?created=${students.length}`);
}

export async function deleteAssignmentAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  const a = await db.assignment.findFirst({ where: { id, deletedAt: null } });
  if (!a) return { error: t("common.notFound") };
  const session = await requireManager(a.courseId);
  await db.assignment.update({ where: { id }, data: { deletedAt: new Date() } });
  await db.auditLog.create({ data: { userId: session.user.id, action: "assignment.delete", entity: "Assignment", entityId: id } });
  refresh();
  redirect("/teacher/assignments");
}

// ── Student: submit ──

export async function submitAssignmentAction(assignmentId: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") return { error: t("errors.forbidden") };
  // Deadline is enforced here on the server, not only by the disabled button.
  const open = await assignmentOpenForStudent(session.user.id, assignmentId);
  if (!open) return { error: t("assignments.closed") };
  const { assignment, late } = open;

  const text = optStr(fd, "text");
  const fileUrl = optStr(fd, "fileUrl");
  const type = assignment.submissionType;
  if (type === "FILE" && !fileUrl) return { error: t("assignments.needFile") };
  if (type === "TEXT" && !text) return { error: t("assignments.needText") };
  if (type === "BOTH" && !fileUrl && !text) return { error: t("assignments.needContent") };
  if (fileUrl) {
    const err = await verifyUpload(fileUrl, submissionPrefix(assignment.courseId, assignment.id, session.user.id));
    if (err) return { error: err };
  }

  const data = {
    text: type === "FILE" ? null : text,
    fileUrl: type === "TEXT" ? null : fileUrl,
    submittedAt: new Date(),
    isLate: late,
    deletedAt: null,
  };
  await db.submission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: session.user.id } },
    update: data,
    create: { ...data, assignmentId, studentId: session.user.id },
  });
  refresh();
  return { success: t("assignments.submittedOk") };
}

// ── Teacher: grade ──

export async function gradeAction(submissionId: string, nextHref: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  const submission = await db.submission.findFirst({ where: { id: submissionId, deletedAt: null }, include: { assignment: true, grade: true } });
  if (!submission) return { error: t("common.notFound") };
  const session = await requireManager(submission.assignment.courseId);

  const raw = Number(str(fd, "score").replace(",", "."));
  const max = submission.assignment.maxScore;
  if (!Number.isFinite(raw) || raw < 0 || raw > max) return { error: t("assignments.badScore", { max }) };
  const comment = optStr(fd, "comment");

  const grade = await db.grade.upsert({
    where: { submissionId },
    update: { score: raw, comment, gradedById: session.user.id, gradedAt: new Date(), deletedAt: null },
    create: { submissionId, score: raw, comment, gradedById: session.user.id },
  });
  // TZ 5 / 7: every grade change is audited.
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "grade.set",
      entity: "Grade",
      entityId: grade.id,
      oldValue: submission.grade ? { score: submission.grade.score, comment: submission.grade.comment } : undefined,
      newValue: { score: raw, comment },
    },
  });
  const final = effectiveScore(raw, submission.isLate, submission.assignment.latePenaltyPct);
  await notifyUsers([{
      userId: submission.studentId,
      type: "grade",
      message: t("assignments.gradedNotice", { title: submission.assignment.title, score: final, max }),
      link: `/student/assignments/${submission.assignmentId}`,
    }]);
  refresh();
  // Bound args come back from the client: only follow in-app grading links.
  if (nextHref?.startsWith("/teacher/assignments/") && fd.get("goNext") === "1") redirect(nextHref);
  return { success: t("assignments.gradeSaved") };
}
