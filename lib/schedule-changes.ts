import "server-only";
import type { ScheduleChangeType } from "@prisma/client";
import { dayOfWeek, formatDate, parseDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { optStr, str } from "@/lib/form";
import { t } from "@/lib/i18n";
import { notifyScheduleChange, slotInclude } from "@/lib/schedule";

export type ChangeInput = {
  date: Date | null;
  type: ScheduleChangeType;
  reason: string;
  newDate: Date | null;
  newPeriodId: string | null;
  newRoomId: string | null;
};

export function readChangeForm(fd: FormData): ChangeInput {
  const type = str(fd, "type") === "MOVED" ? "MOVED" : "CANCELLED";
  const moved = type === "MOVED";
  return {
    date: parseDate(str(fd, "date")),
    type,
    reason: str(fd, "reason"),
    newDate: moved ? parseDate(str(fd, "newDate")) : null,
    newPeriodId: moved ? optStr(fd, "newPeriodId") : null,
    newRoomId: moved ? optStr(fd, "newRoomId") : null,
  };
}

async function loadSlot(slotId: string) {
  return db.scheduleSlot.findFirst({ where: { id: slotId, deletedAt: null }, include: { ...slotInclude, semester: true } });
}

/** Shared rules for a one-off change (admin edit or teacher proposal). Returns an error message or null. */
export async function validateChange(slotId: string, c: ChangeInput): Promise<string | null> {
  const slot = await loadSlot(slotId);
  if (!slot) return t("common.notFound");
  if (!c.date || !c.reason) return t("common.required");
  if (dayOfWeek(c.date) !== slot.dayOfWeek) return t("schedule.wrongDay", { day: t(`days.${slot.dayOfWeek}`) });
  if (c.date < slot.semester.startDate || c.date > slot.semester.endDate) return t("schedule.outsideSemester");
  if (c.type === "MOVED" && !c.newDate && !c.newPeriodId && !c.newRoomId) return t("schedule.moveNeedsTarget");
  if (await db.scheduleChange.findFirst({ where: { slotId, date: c.date, deletedAt: null } })) return t("schedule.changeExists");
  return null;
}

/** Validate, record the change, audit it and notify the group. */
export async function applyChange(slotId: string, c: ChangeInput, userId: string): Promise<{ error: string } | { count: number }> {
  const error = await validateChange(slotId, c);
  if (error) return { error };
  const slot = (await loadSlot(slotId))!;
  const date = c.date!;
  const change = await db.scheduleChange.create({
    data: { slotId, date, type: c.type, reason: c.reason, newDate: c.newDate, newPeriodId: c.newPeriodId, newRoomId: c.newRoomId },
  });
  await db.auditLog.create({
    data: { userId, action: `schedule.${c.type.toLowerCase()}`, entity: "ScheduleChange", entityId: change.id, newValue: { slotId, date: formatDate(date), reason: c.reason } },
  });
  const what =
    c.type === "MOVED"
      ? `${t("schedule.moved").toLowerCase()}${c.newDate ? ` → ${formatDate(c.newDate)}` : ""}. ${c.reason}`
      : `${t("schedule.cancelled").toLowerCase()}. ${c.reason}`;
  return { count: await notifyScheduleChange(slot, date, what) };
}
