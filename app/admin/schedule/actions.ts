"use server";

import type { LessonType, ScheduleChangeType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dayOfWeek, formatDate, parseDate } from "@/lib/dates";
import { optStr, str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { assertRole } from "@/lib/permissions";
import { findSlotConflicts, notifyScheduleChange, slotInclude, type SlotInput } from "@/lib/schedule";
import { parseScheduleWorkbook, saveSchedule } from "@/lib/schedule-import";

async function readSlot(fd: FormData, semesterId: string): Promise<SlotInput & { lessonType: LessonType | null }> {
  // Typing a new room name creates the room on the fly.
  let roomId = optStr(fd, "roomId");
  const newRoom = str(fd, "newRoom");
  if (newRoom) {
    roomId = (await db.room.upsert({ where: { name: newRoom }, update: { deletedAt: null }, create: { name: newRoom } })).id;
  }
  return {
    semesterId,
    courseId: str(fd, "courseId"),
    groupId: str(fd, "groupId"),
    teacherId: optStr(fd, "teacherId"),
    roomId,
    periodId: str(fd, "periodId"),
    dayOfWeek: Number(str(fd, "dayOfWeek")),
    alternating: fd.get("alternating") === "on",
    lessonType: (optStr(fd, "lessonType") as LessonType | null) ?? null,
  };
}

async function audit(userId: string, action: string, entityId: string, oldValue: unknown, newValue: unknown) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entity: "ScheduleSlot",
      entityId,
      oldValue: oldValue === null ? undefined : JSON.parse(JSON.stringify(oldValue)),
      newValue: newValue === null ? undefined : JSON.parse(JSON.stringify(newValue)),
    },
  });
}

export async function saveSlotAction(id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const semester = await db.semester.findFirst({ where: { isActive: true, deletedAt: null } });
  if (!semester) return { error: t("schedule.noActiveSemester") };

  const data = await readSlot(fd, semester.id);
  if (!data.courseId || !data.groupId || !data.periodId || !(data.dayOfWeek >= 1 && data.dayOfWeek <= 6)) {
    return { error: t("common.required") };
  }
  const conflicts = await findSlotConflicts(data, id ?? undefined);
  if (conflicts.length) return { error: conflicts.join(". ") };

  const before = id ? await db.scheduleSlot.findUnique({ where: { id } }) : null;
  const slot = id ? await db.scheduleSlot.update({ where: { id }, data }) : await db.scheduleSlot.create({ data });
  // Keep course ↔ group/teacher links in sync with the timetable.
  await db.courseGroup.upsert({
    where: { courseId_groupId: { courseId: slot.courseId, groupId: slot.groupId } },
    update: { deletedAt: null },
    create: { courseId: slot.courseId, groupId: slot.groupId },
  });
  if (slot.teacherId) {
    const role = slot.lessonType && slot.lessonType !== "LECTURE" ? "PRACTICE" : "LECTURE";
    await db.courseTeacher.upsert({
      where: { courseId_userId_role: { courseId: slot.courseId, userId: slot.teacherId, role } },
      update: { deletedAt: null },
      create: { courseId: slot.courseId, userId: slot.teacherId, role },
    });
  }
  await audit(session.user.id, id ? "schedule.update" : "schedule.create", slot.id, before, slot);
  revalidatePath("/admin/schedule");
  return { success: t("schedule.slotSaved") };
}

export async function deleteSlotAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const slot = await db.scheduleSlot.update({ where: { id }, data: { deletedAt: new Date() } });
  await audit(session.user.id, "schedule.delete", id, slot, null);
  revalidatePath("/admin/schedule");
  redirect(`/admin/schedule?view=group&id=${slot.groupId}`);
}

/** Cancel or move a single occurrence of a weekly slot; notifies the group. */
export async function saveChangeAction(slotId: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const slot = await db.scheduleSlot.findFirst({ where: { id: slotId, deletedAt: null }, include: { ...slotInclude, semester: true } });
  if (!slot) return { error: t("common.notFound") };

  const date = parseDate(str(fd, "date"));
  const type = str(fd, "type") as ScheduleChangeType;
  const reason = str(fd, "reason");
  if (!date || !reason || (type !== "CANCELLED" && type !== "MOVED")) return { error: t("common.required") };
  if (dayOfWeek(date) !== slot.dayOfWeek) return { error: t("schedule.wrongDay", { day: t(`days.${slot.dayOfWeek}`) }) };
  if (date < slot.semester.startDate || date > slot.semester.endDate) return { error: t("schedule.outsideSemester") };
  if (await db.scheduleChange.findFirst({ where: { slotId, date, deletedAt: null } })) return { error: t("schedule.changeExists") };

  const moved = type === "MOVED";
  const newDate = moved ? parseDate(str(fd, "newDate")) : null;
  const newPeriodId = moved ? optStr(fd, "newPeriodId") : null;
  const newRoomId = moved ? optStr(fd, "newRoomId") : null;
  if (moved && !newDate && !newPeriodId && !newRoomId) return { error: t("schedule.moveNeedsTarget") };

  const change = await db.scheduleChange.create({ data: { slotId, date, type, reason, newDate, newPeriodId, newRoomId } });
  await db.auditLog.create({
    data: { userId: session.user.id, action: `schedule.${type.toLowerCase()}`, entity: "ScheduleChange", entityId: change.id, newValue: { slotId, date: formatDate(date), reason } },
  });

  const what = moved
    ? `${t("schedule.moved").toLowerCase()}${newDate ? ` → ${formatDate(newDate)}` : ""}. ${reason}`
    : `${t("schedule.cancelled").toLowerCase()}. ${reason}`;
  const count = await notifyScheduleChange(slot, date, what);
  revalidatePath("/admin/schedule");
  return { success: t("schedule.changeSaved", { count }) };
}

export async function deleteChangeAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const change = await db.scheduleChange.update({ where: { id }, data: { deletedAt: new Date() } });
  await db.auditLog.create({ data: { userId: session.user.id, action: "schedule.change.undo", entity: "ScheduleChange", entityId: id } });
  revalidatePath("/admin/schedule");
  return { success: t("common.deleted"), data: change.id };
}

export type ImportReport = { file: string; summary: string; conflicts: string[] };

export async function importScheduleAction(_p: FormState, fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const semester = await db.semester.findFirst({ where: { isActive: true, deletedAt: null } });
  if (!semester) return { error: t("schedule.noActiveSemester") };
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: t("import.noFile") };

  const reports: ImportReport[] = [];
  for (const file of files) {
    let parsed;
    try {
      parsed = await parseScheduleWorkbook(await file.arrayBuffer());
    } catch (e) {
      return { error: `${file.name}: ${e instanceof Error ? e.message : t("import.badFile")}` };
    }
    const r = await saveSchedule(db, parsed, semester.id);
    reports.push({
      file: file.name,
      summary: t("schedule.importDone", { file: file.name, groups: r.groups, courses: r.courses, teachers: r.teachers, slots: r.slots }),
      conflicts: r.conflicts.map(
        (c) => `${t(`days.${c.dayOfWeek}`)}, ${c.period}-para — ${c.kind === "teacher" ? t("schedule.teacher") : t("schedule.room")} ${c.who}: ${c.groups.join(", ")}`,
      ),
    });
  }
  await db.auditLog.create({
    data: { userId: session.user.id, action: "schedule.import", entity: "ScheduleSlot", newValue: { files: files.map((f) => f.name) } },
  });
  revalidatePath("/admin/schedule");
  return { success: reports.map((r) => r.summary).join(" · "), data: reports };
}
