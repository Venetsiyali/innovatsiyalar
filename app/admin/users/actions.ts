"use server";

import type { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { isUniqueError, optStr, str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { assertRole } from "@/lib/permissions";
import { emailCredentials } from "@/lib/notify";
import { importUsers } from "@/lib/user-import";

const ROLES = ["ADMIN", "TEACHER", "STUDENT"] as const;

const credentialTexts = {
  subject: t("mail.credentialsSubject"),
  body: (u: { fullName: string; email: string; password: string }) =>
    t("mail.credentialsBody", { name: u.fullName, email: u.email, password: u.password }),
};

const userSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().toLowerCase().email(),
  role: z.enum(ROLES),
  phone: z.string().nullable(),
});

function readUser(fd: FormData) {
  return userSchema.safeParse({
    fullName: str(fd, "fullName"),
    email: str(fd, "email"),
    role: str(fd, "role") as Role,
    phone: optStr(fd, "phone"),
  });
}

export async function createUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const parsed = readUser(fd);
  if (!parsed.success) return { error: t("common.required") };

  const password = generateTempPassword();
  try {
    const user = await db.user.create({
      data: { ...parsed.data, passwordHash: await hashPassword(password), mustChangePassword: true },
    });
    const groupId = optStr(fd, "groupId");
    if (groupId && user.role === "STUDENT") await db.enrollment.create({ data: { userId: user.id, groupId } });
  } catch (e) {
    if (isUniqueError(e)) return { error: t("users.emailTaken") };
    throw e;
  }
  revalidatePath("/admin/users");
  const mailed = emailCredentials([{ ...parsed.data, password }], credentialTexts);
  return { success: `${t("users.tempPassword", { password })}${mailed ? ` ${t("mail.sentToo")}` : ""}` };
}

export async function updateUserAction(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const parsed = readUser(fd);
  if (!parsed.success) return { error: t("common.required") };
  const isActive = fd.get("isActive") === "on";
  if (id === session.user.id && (!isActive || parsed.data.role !== "ADMIN")) return { error: t("users.deleteSelf") };

  try {
    await db.user.update({ where: { id }, data: { ...parsed.data, isActive } });
  } catch (e) {
    if (isUniqueError(e)) return { error: t("users.emailTaken") };
    throw e;
  }
  revalidatePath("/admin/users");
  return { success: t("common.saved") };
}

export async function resetPasswordAction(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const password = generateTempPassword();
  const user = await db.user.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
  });
  const mailed = emailCredentials([{ email: user.email, fullName: user.fullName, password }], credentialTexts);
  return { success: `${t("users.tempPassword", { password })}${mailed ? ` ${t("mail.sentToo")}` : ""}` };
}

export async function deleteUserAction(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  if (id === session.user.id) return { error: t("users.deleteSelf") };
  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id }, data: { deletedAt: now, isActive: false } }),
    db.enrollment.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: now } }),
    db.courseTeacher.updateMany({ where: { userId: id, deletedAt: null }, data: { deletedAt: now } }),
  ]);
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/** Merge a duplicate teacher account (same person, different spelling) into another. */
export async function mergeTeacherAction(sourceId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const targetId = str(fd, "targetId");
  if (!targetId || targetId === sourceId) return { error: t("common.required") };

  const links = await db.courseTeacher.findMany({ where: { userId: sourceId, deletedAt: null } });
  const now = new Date();
  const slots = await db.$transaction(async (tx) => {
    for (const link of links) {
      // Target may already teach this course in the same role (unique constraint).
      await tx.courseTeacher.upsert({
        where: { courseId_userId_role: { courseId: link.courseId, userId: targetId, role: link.role } },
        update: { deletedAt: null },
        create: { courseId: link.courseId, userId: targetId, role: link.role },
      });
    }
    await tx.courseTeacher.updateMany({ where: { userId: sourceId }, data: { deletedAt: now } });
    const moved = await tx.scheduleSlot.updateMany({ where: { teacherId: sourceId }, data: { teacherId: targetId } });
    await tx.user.update({ where: { id: sourceId }, data: { deletedAt: now, isActive: false } });
    await tx.auditLog.create({
      data: { action: "user.merge", entity: "User", entityId: sourceId, newValue: { targetId, slots: moved.count } },
    });
    return moved.count;
  });
  revalidatePath("/admin/users");
  redirect(`/admin/users/${targetId}?merged=${slots}`);
}

export async function importUsersAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await assertRole("ADMIN");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: t("import.noFile") };
  const result = await importUsers(file.name, await file.arrayBuffer());
  if ("error" in result) return { error: result.error };
  revalidatePath("/admin/users");
  emailCredentials(result.created, credentialTexts);
  return {
    success: t("import.result", { created: result.created.length, skipped: result.errors.length }),
    data: result,
  };
}
