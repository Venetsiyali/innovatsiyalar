import "server-only";
import type { Role } from "@prisma/client";
import { attachmentPrefix, submissionPrefix } from "@/lib/assignment-rules";
import { assignmentOpenForStudent } from "@/lib/assignments";
import { canManageCourse } from "@/lib/course-access";
import { checkFile } from "@/lib/files";
import { t } from "@/lib/i18n";
import { coursePrefix } from "@/lib/storage";

export type UploadPayload = { courseId?: string; assignmentId?: string; kind?: "material" | "attachment" | "submission" };

/** Shared by the Blob token route and the local upload route. Returns an error message or null. */
export async function authorizeUpload(user: { id: string; role: Role }, pathname: string, p: UploadPayload): Promise<string | null> {
  const problem = checkFile(pathname, 0);
  if (problem) return t(problem);
  if (!p.courseId) return t("errors.forbidden");

  if (p.kind === "submission") {
    if (user.role !== "STUDENT" || !p.assignmentId) return t("errors.forbidden");
    const open = await assignmentOpenForStudent(user.id, p.assignmentId);
    if (!open || open.assignment.courseId !== p.courseId) return t("assignments.closed");
    return pathname.startsWith(submissionPrefix(p.courseId, p.assignmentId, user.id)) ? null : t("errors.forbidden");
  }

  if (!(await canManageCourse(user, p.courseId))) return t("errors.forbidden");
  const prefix = p.kind === "attachment" ? attachmentPrefix(p.courseId) : coursePrefix(p.courseId);
  return pathname.startsWith(prefix) ? null : t("errors.forbidden");
}
