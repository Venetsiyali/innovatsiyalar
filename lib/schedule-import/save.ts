import type { PrismaClient, TeacherRole } from "@prisma/client";
import type { ParsedSchedule } from "./parse";
import { courseLanguage } from "./parse";
import { keyOf, personKey, sentenceCase, shortHash, slugify, titleCase } from "./normalize";

// Header suffix → program. Order matters ("Rus tili" before generic "rus").
const PROGRAMS: { test: RegExp; code: string; name: string }[] = [
  { test: /^rus tili/i, code: "RUS", name: "Rus tili va adabiyoti" },
  { test: /yuris|^yu\.r/i, code: "JUR", name: "Yurisprudensiya" },
  { test: /iqtisod/i, code: "ECO", name: "Iqtisodiyot" },
  { test: /turizm/i, code: "TUR", name: "Turizm" },
  { test: /axborot/i, code: "INFOSEC", name: "Axborot xavfsizligi" },
  { test: /sun'?iy|suniy/i, code: "AI", name: "Sun'iy intellekt" },
  { test: /^ar(x|r)i/i, code: "ARCH", name: "Arxitektura" },
  { test: /^in\b|ingliz/i, code: "ENG", name: "Ingliz tili filologiyasi" },
  { test: /arab/i, code: "ARAB", name: "Arab tili filologiyasi" },
  { test: /xitoy/i, code: "CHN", name: "Xitoy tili filologiyasi" },
  { test: /boshlang/i, code: "PRIM", name: "Boshlang'ich ta'lim" },
  { test: /jurnal/i, code: "JOUR", name: "Jurnalistika" },
];
const OTHER_PROGRAM = { code: "OTHER", name: "Boshqa yo'nalish" };
// Faculties are not in the source files; everything lands here until the admin reorganises.
const DEFAULT_FACULTY = { code: "GEN", name: "Umumiy fakultet" };

export type ImportConflict = { kind: "teacher" | "room"; who: string; dayOfWeek: number; period: number; groups: string[] };

export type ImportResult = {
  groups: number;
  courses: number;
  teachers: number;
  rooms: number;
  slots: number;
  conflicts: ImportConflict[];
};

export function teacherEmail(name: string): string {
  return `${slugify(personKey(name)).replace(/-/g, ".") || "teacher"}@iusi.uz`;
}

export function courseCode(name: string): string {
  return `${slugify(name).slice(0, 24).toUpperCase()}-${shortHash(keyOf(name)).toUpperCase()}`;
}

/**
 * A teacher/room in two places at once is a conflict — unless it is the same
 * subject in the same room (a combined "potok" lecture for several groups).
 */
export function findConflicts(parsed: ParsedSchedule): ImportConflict[] {
  const conflicts: ImportConflict[] = [];
  for (const kind of ["teacher", "room"] as const) {
    const buckets = new Map<string, ParsedSchedule["lessons"]>();
    for (const l of parsed.lessons) {
      const who = l[kind];
      if (!who) continue;
      const k = `${kind === "teacher" ? personKey(who) : keyOf(who)}|${l.dayOfWeek}|${l.period}`;
      buckets.set(k, [...(buckets.get(k) ?? []), l]);
    }
    for (const lessons of buckets.values()) {
      if (lessons.length < 2) continue;
      const distinct = new Set(lessons.map((l) => `${keyOf(l.subject)}|${keyOf(l.room ?? "")}|${personKey(l.teacher ?? "")}`));
      if (distinct.size > 1) {
        const { dayOfWeek, period } = lessons[0];
        conflicts.push({ kind, who: lessons[0][kind]!, dayOfWeek, period, groups: lessons.map((l) => l.group) });
      }
    }
  }
  return conflicts;
}

/**
 * Write a parsed schedule into the database for one semester.
 * Idempotent: re-importing replaces (soft-deletes) the previous slots of the same groups.
 */
export async function saveSchedule(db: PrismaClient, parsed: ParsedSchedule, semesterId: string): Promise<ImportResult> {
  const faculty = await db.faculty.upsert({
    where: { code: DEFAULT_FACULTY.code },
    update: {},
    create: DEFAULT_FACULTY,
  });

  // Bell schedule
  const periodIds = new Map<number, string>();
  for (const p of parsed.periods) {
    const row = await db.lessonPeriod.upsert({
      where: { shift_number: { shift: parsed.shift, number: p.number } },
      update: { startTime: p.startTime, endTime: p.endTime, deletedAt: null },
      create: { shift: parsed.shift, ...p },
    });
    periodIds.set(p.number, row.id);
  }

  // Programs + groups
  const groupIds = new Map<string, string>();
  for (const g of parsed.groups) {
    const prog = PROGRAMS.find((p) => p.test.test(g.programKey)) ?? OTHER_PROGRAM;
    const program = await db.program.upsert({
      where: { code: prog.code },
      update: {},
      create: { code: prog.code, name: prog.name, facultyId: faculty.id },
    });
    const group = await db.group.upsert({
      where: { name: g.name },
      update: { programId: program.id, semesterId, shift: parsed.shift, language: g.language, deletedAt: null },
      create: { name: g.name, programId: program.id, semesterId, shift: parsed.shift, language: g.language },
    });
    groupIds.set(g.name, group.id);
  }

  // Teachers (no password yet — admin activates accounts later)
  const teacherIds = new Map<string, string>();
  for (const l of parsed.lessons) {
    if (!l.teacher || teacherIds.has(personKey(l.teacher))) continue;
    const email = teacherEmail(l.teacher);
    const user = await db.user.upsert({
      where: { email },
      update: {},
      create: { email, fullName: titleCase(l.teacher), role: "TEACHER" },
    });
    teacherIds.set(personKey(l.teacher), user.id);
  }

  // Rooms
  const roomIds = new Map<string, string>();
  for (const l of parsed.lessons) {
    if (!l.room || roomIds.has(keyOf(l.room))) continue;
    const room = await db.room.upsert({ where: { name: l.room }, update: {}, create: { name: l.room } });
    roomIds.set(keyOf(l.room), room.id);
  }

  // Courses (one per distinct subject name)
  const courseIds = new Map<string, string>();
  for (const l of parsed.lessons) {
    const k = keyOf(l.subject);
    if (courseIds.has(k)) continue;
    const code = courseCode(l.subject);
    const course = await db.course.upsert({
      where: { code },
      update: { deletedAt: null },
      create: { code, name: sentenceCase(l.subject), language: courseLanguage(l.subject), semesterId },
    });
    courseIds.set(k, course.id);
  }

  // Course ↔ group and course ↔ teacher links
  const links = new Set<string>();
  for (const l of parsed.lessons) {
    const courseId = courseIds.get(keyOf(l.subject))!;
    const groupId = groupIds.get(l.group)!;
    if (!links.has(`g|${courseId}|${groupId}`)) {
      links.add(`g|${courseId}|${groupId}`);
      await db.courseGroup.upsert({
        where: { courseId_groupId: { courseId, groupId } },
        update: { deletedAt: null },
        create: { courseId, groupId },
      });
    }
    if (l.teacher) {
      const userId = teacherIds.get(personKey(l.teacher))!;
      const role: TeacherRole = l.lessonType && l.lessonType !== "LECTURE" ? "PRACTICE" : "LECTURE";
      if (!links.has(`t|${courseId}|${userId}|${role}`)) {
        links.add(`t|${courseId}|${userId}|${role}`);
        await db.courseTeacher.upsert({
          where: { courseId_userId_role: { courseId, userId, role } },
          update: { deletedAt: null },
          create: { courseId, userId, role },
        });
      }
    }
  }

  // Replace weekly slots for these groups
  await db.scheduleSlot.updateMany({
    where: { semesterId, groupId: { in: [...groupIds.values()] }, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  const { count } = await db.scheduleSlot.createMany({
    data: parsed.lessons.map((l) => ({
      semesterId,
      courseId: courseIds.get(keyOf(l.subject))!,
      groupId: groupIds.get(l.group)!,
      teacherId: l.teacher ? teacherIds.get(personKey(l.teacher)) : null,
      roomId: l.room ? roomIds.get(keyOf(l.room)) : null,
      periodId: periodIds.get(l.period)!,
      dayOfWeek: l.dayOfWeek,
      lessonType: l.lessonType,
      alternating: l.alternating,
    })),
  });

  return {
    groups: groupIds.size,
    courses: courseIds.size,
    teachers: teacherIds.size,
    rooms: roomIds.size,
    slots: count,
    conflicts: findConflicts(parsed),
  };
}
