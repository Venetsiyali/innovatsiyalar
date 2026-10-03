import "server-only";
import type { LessonType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { addDays, dayOfWeek, formatDate, isoDate } from "@/lib/dates";
import { t } from "@/lib/i18n";

export const slotInclude = {
  course: { select: { id: true, name: true } },
  group: { select: { id: true, name: true, shift: true } },
  teacher: { select: { id: true, fullName: true } },
  room: { select: { id: true, name: true } },
  period: true,
} satisfies Prisma.ScheduleSlotInclude;

export type SlotWithRefs = Prisma.ScheduleSlotGetPayload<{ include: typeof slotInclude }>;

export type ChangeInfo = {
  id: string;
  type: "MOVED" | "CANCELLED";
  reason: string;
  newDate: Date | null;
  newPeriodLabel: string | null;
  newRoomName: string | null;
};

export async function activeSemester() {
  return db.semester.findFirst({ where: { isActive: true, deletedAt: null } });
}

export type SlotFilter = { groupIds?: string[]; teacherId?: string; roomId?: string };

export async function findSlots(semesterId: string, filter: SlotFilter): Promise<SlotWithRefs[]> {
  return db.scheduleSlot.findMany({
    where: {
      semesterId,
      deletedAt: null,
      ...(filter.groupIds && { groupId: { in: filter.groupIds } }),
      ...(filter.teacherId && { teacherId: filter.teacherId }),
      ...(filter.roomId && { roomId: filter.roomId }),
    },
    include: slotInclude,
    orderBy: [{ dayOfWeek: "asc" }, { period: { number: "asc" } }],
  });
}

/** One-off changes (cancel/move) for the given slots within [monday, monday+6]. Key: `${slotId}|${isoDate}`. */
export async function changesForWeek(slotIds: string[], monday: Date): Promise<Map<string, ChangeInfo>> {
  if (!slotIds.length) return new Map();
  const changes = await db.scheduleChange.findMany({
    where: { slotId: { in: slotIds }, deletedAt: null, date: { gte: monday, lte: addDays(monday, 6) } },
  });
  const periodIds = changes.map((c) => c.newPeriodId).filter(Boolean) as string[];
  const roomIds = changes.map((c) => c.newRoomId).filter(Boolean) as string[];
  const [periods, rooms] = await Promise.all([
    db.lessonPeriod.findMany({ where: { id: { in: periodIds } } }),
    db.room.findMany({ where: { id: { in: roomIds } } }),
  ]);
  const periodById = new Map(periods.map((p) => [p.id, p]));
  const roomById = new Map(rooms.map((r) => [r.id, r.name]));

  return new Map(
    changes.map((c) => {
      const p = c.newPeriodId ? periodById.get(c.newPeriodId) : undefined;
      return [
        `${c.slotId}|${isoDate(c.date)}`,
        {
          id: c.id,
          type: c.type,
          reason: c.reason,
          newDate: c.newDate,
          newPeriodLabel: p ? `${p.number}-para (${p.startTime})` : null,
          newRoomName: c.newRoomId ? (roomById.get(c.newRoomId) ?? null) : null,
        },
      ];
    }),
  );
}

export type SlotInput = {
  semesterId: string;
  courseId: string;
  groupId: string;
  teacherId: string | null;
  roomId: string | null;
  periodId: string;
  dayOfWeek: number;
  alternating: boolean;
};

/**
 * Conflict rules (TZ 4.3): a group, teacher or room cannot be in two places at once.
 * Exceptions: a combined "potok" lecture (same course, teacher and room for several groups),
 * and two "migalka" (every-other-week) lessons sharing a group slot.
 */
export async function findSlotConflicts(input: SlotInput, excludeId?: string): Promise<string[]> {
  const sameTime = await db.scheduleSlot.findMany({
    where: {
      semesterId: input.semesterId,
      dayOfWeek: input.dayOfWeek,
      periodId: input.periodId,
      deletedAt: null,
      ...(excludeId && { id: { not: excludeId } }),
      OR: [
        { groupId: input.groupId },
        ...(input.teacherId ? [{ teacherId: input.teacherId }] : []),
        ...(input.roomId ? [{ roomId: input.roomId }] : []),
      ],
    },
    include: slotInclude,
  });

  const errors: string[] = [];
  for (const other of sameTime) {
    const potok =
      other.courseId === input.courseId && other.teacherId === input.teacherId && other.roomId === input.roomId;
    if (other.groupId === input.groupId) {
      if (!(input.alternating && other.alternating)) {
        errors.push(t("schedule.conflictGroup", { group: other.group.name, course: other.course.name }));
      }
      continue;
    }
    if (potok) continue;
    if (input.teacherId && other.teacherId === input.teacherId) {
      errors.push(t("schedule.conflictTeacher", { teacher: other.teacher!.fullName, group: other.group.name }));
    }
    if (input.roomId && other.roomId === input.roomId) {
      errors.push(t("schedule.conflictRoom", { room: other.room!.name, group: other.group.name }));
    }
  }
  return [...new Set(errors)];
}

/** Notify a group's students (and the slot's teacher) about a one-off schedule change. */
export async function notifyScheduleChange(slot: SlotWithRefs, date: Date, message: string) {
  const students = await db.enrollment.findMany({
    where: { groupId: slot.groupId, deletedAt: null, status: "ACTIVE" },
    select: { userId: true },
  });
  const week = isoDate(addDays(date, 1 - dayOfWeek(date)));
  const rows = [
    ...students.map((s) => ({ userId: s.userId, link: `/student/schedule?week=${week}` })),
    ...(slot.teacherId ? [{ userId: slot.teacherId, link: `/teacher/schedule?week=${week}` }] : []),
  ];
  if (!rows.length) return 0;
  const text = `${slot.course.name} (${slot.group.name}), ${formatDate(date)}: ${message}`;
  // TODO(stage 6): also send email.
  const { count } = await db.notification.createMany({
    data: rows.map((r) => ({ ...r, type: "schedule_change", message: text })),
  });
  return count;
}

export const LESSON_TYPES: LessonType[] = ["LECTURE", "SEMINAR", "PRACTICE"];
