"use server";

import type { Language, TeacherRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { int, isUniqueError, str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { assertRole } from "@/lib/permissions";

export async function saveCourseAction(id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const data = {
    name: str(fd, "name"),
    code: str(fd, "code").toUpperCase(),
    credits: int(fd, "credits"),
    semesterId: str(fd, "semesterId"),
    language: str(fd, "language") as Language,
    weightCurrent: int(fd, "weightCurrent"),
    weightMidterm: int(fd, "weightMidterm"),
    weightFinal: int(fd, "weightFinal"),
  };
  if (!data.name || !data.code || !data.semesterId) return { error: t("common.required") };
  if (data.weightCurrent + data.weightMidterm + data.weightFinal !== 100) return { error: t("courses.weightsSum") };

  let courseId = id;
  try {
    courseId = id ? (await db.course.update({ where: { id }, data })).id : (await db.course.create({ data })).id;
  } catch (e) {
    if (isUniqueError(e)) return { error: t("courses.codeTaken") };
    throw e;
  }
  revalidatePath("/admin/courses");
  if (!id) redirect(`/admin/courses/${courseId}`);
  return { success: t("common.saved") };
}

export async function deleteCourseAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const now = new Date();
  await db.$transaction([
    db.course.update({ where: { id }, data: { deletedAt: now } }),
    db.courseTeacher.updateMany({ where: { courseId: id, deletedAt: null }, data: { deletedAt: now } }),
    db.courseGroup.updateMany({ where: { courseId: id, deletedAt: null }, data: { deletedAt: now } }),
    db.scheduleSlot.updateMany({ where: { courseId: id, deletedAt: null }, data: { deletedAt: now } }),
  ]);
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function addTeacherAction(courseId: string, _p: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const userId = str(fd, "userId");
  const role = str(fd, "role") as TeacherRole;
  const teacher = await db.user.findFirst({ where: { id: userId, role: "TEACHER", deletedAt: null } });
  if (!teacher) return { error: t("common.required") };
  await db.courseTeacher.upsert({
    where: { courseId_userId_role: { courseId, userId, role } },
    update: { deletedAt: null },
    create: { courseId, userId, role },
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { success: t("common.saved") };
}

export async function removeTeacherAction(linkId: string, courseId: string, _p: FormState, _fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  await db.courseTeacher.update({ where: { id: linkId }, data: { deletedAt: new Date() } });
  revalidatePath(`/admin/courses/${courseId}`);
  return {};
}

/** Replace the set of groups studying this course with the checked ones. */
export async function saveCourseGroupsAction(courseId: string, _p: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const groupIds = fd.getAll("groupIds").map(String);
  await db.$transaction(async (tx) => {
    await tx.courseGroup.updateMany({
      where: { courseId, groupId: { notIn: groupIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    for (const groupId of groupIds) {
      await tx.courseGroup.upsert({
        where: { courseId_groupId: { courseId, groupId } },
        update: { deletedAt: null },
        create: { courseId, groupId },
      });
    }
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { success: t("common.saved") };
}
