// Usage: npm run import:schedule -- data/kunduzgi-1-semestr.xlsx [more.xlsx …]
// Imports into the currently active semester.
import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { parseScheduleWorkbook, saveSchedule } from "../lib/schedule-import";

const DAY = ["", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];

export async function importFiles(db: PrismaClient, files: string[]) {
  const semester = await db.semester.findFirst({ where: { isActive: true, deletedAt: null } });
  if (!semester) throw new Error("Faol semestr topilmadi — avval seed'ni ishga tushiring");

  for (const file of files) {
    const parsed = await parseScheduleWorkbook(await readFile(file));
    const r = await saveSchedule(db, parsed, semester.id);
    console.log(
      `✔ ${file} (${parsed.shift}): ${r.groups} guruh, ${r.courses} fan, ${r.teachers} o'qituvchi, ${r.rooms} xona, ${r.slots} dars`,
    );
    for (const c of r.conflicts) {
      console.warn(`  ⚠ ${c.kind === "teacher" ? "O'qituvchi" : "Xona"} to'qnashuvi: ${c.who} — ${DAY[c.dayOfWeek]}, ${c.period}-para: ${c.groups.join(", ")}`);
    }
  }
}

if (require.main === module) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Fayl ko'rsating: npm run import:schedule -- data/jadval.xlsx");
    process.exit(1);
  }
  const db = new PrismaClient();
  importFiles(db, files)
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
