"use server";

import type { Language, Shift } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { int, isUniqueError, str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { assertRole } from "@/lib/permissions";

function readGroup(fd: FormData) {
  return {
    name: str(fd, "name"),
    programId: str(fd, "programId"),
    semesterId: str(fd, "semesterId"),
    year: int(fd, "year", 1),
    shift: str(fd, "shift") as Shift,
    language: str(fd, "language") as Language,
  };
}

export async function saveGroupAction(id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const data = readGroup(fd);
  if (!data.name || !data.programId || !data.semesterId) return { error: t("common.required") };
  let groupId = id;
  try {
    groupId = id ? (await db.group.update({ where: { id }, data })).id : (await db.group.create({ data })).id;
  } catch (e) {
    if (isUniqueError(e)) return { error: t("groups.nameTaken") };
    throw e;
  }
  revalidatePath("/admin/groups");
  if (!id) redirect(`/admin/groups/${groupId}`);
  return { success: t("common.saved") };
}

export async function deleteGroupAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const now = new Date();
  await db.$transaction([
    db.group.update({ where: { id }, data: { deletedAt: now } }),
    db.enrollment.updateMany({ where: { groupId: id, deletedAt: null }, data: { deletedAt: now } }),
    db.courseGroup.updateMany({ where: { groupId: id, deletedAt: null }, data: { deletedAt: now } }),
    db.scheduleSlot.updateMany({ where: { groupId: id, deletedAt: null }, data: { deletedAt: now } }),
  ]);
  revalidatePath("/admin/groups");
  redirect("/admin/groups");
}

export async function addStudentsAction(groupId: string, _p: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const ids = fd.getAll("userIds").map(String);
  if (!ids.length) return { error: t("groups.noneSelected") };
  // Only real students, and re-activate soft-deleted enrollments.
  const students = await db.user.findMany({ where: { id: { in: ids }, role: "STUDENT", deletedAt: null }, select: { id: true } });
  for (const { id: userId } of students) {
    await db.enrollment.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: { deletedAt: null, status: "ACTIVE" },
      create: { userId, groupId },
    });
  }
  revalidatePath(`/admin/groups/${groupId}`);
  return { success: t("groups.added", { count: students.length }) };
}

export async function removeStudentsAction(groupId: string, _p: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const ids = fd.getAll("userIds").map(String);
  if (!ids.length) return { error: t("groups.noneSelected") };
  const { count } = await db.enrollment.updateMany({
    where: { groupId, userId: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  revalidatePath(`/admin/groups/${groupId}`);
  return { success: t("groups.removed", { count }) };
}
