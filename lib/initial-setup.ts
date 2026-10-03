import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { parseScheduleWorkbook, saveSchedule } from "@/lib/schedule-import";

// Schedule files bundled with the app (see outputFileTracingIncludes in next.config.ts).
export const BUNDLED_SCHEDULES = ["kunduzgi-1-semestr.xlsx", "kechki-1-semestr.xlsx"];

export async function ensureActiveSemester(db: PrismaClient) {
  const existing = await db.semester.findFirst({ where: { isActive: true, deletedAt: null } });
  if (existing) return existing;
  return db.semester.create({
    data: {
      name: "2026–2027 o'quv yili, 1-semestr",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-01-31"),
      isActive: true,
    },
  });
}

export async function importBundledSchedules(db: PrismaClient, semesterId: string) {
  const results = [];
  for (const file of BUNDLED_SCHEDULES) {
    const parsed = await parseScheduleWorkbook(await readFile(path.join(process.cwd(), "data", file)));
    results.push({ file, ...(await saveSchedule(db, parsed, semesterId)) });
  }
  return results;
}
