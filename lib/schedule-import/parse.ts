import ExcelJS from "exceljs";
import type { Language, LessonType, Shift } from "@prisma/client";
import { clean, isCyrillic } from "./normalize";

// Layout of the university's schedule sheets (KUNDUZGI / KECHKI):
//   row 1: "Sana" | "Vaqt" | group headers, each group spanning 2 columns
//   each para = 3 rows: subject / teacher / [lesson type | room]
//   column A holds the weekday (merged), column B the time range (merged over 3 rows)

export type ParsedGroup = { name: string; code: string; programKey: string; language: Language };

export type ParsedLesson = {
  group: string;
  dayOfWeek: number;
  period: number;
  subject: string;
  teacher: string | null;
  room: string | null;
  lessonType: LessonType | null;
  alternating: boolean;
};

export type ParsedPeriod = { number: number; startTime: string; endTime: string };

export type ParsedSchedule = {
  shift: Shift;
  groups: ParsedGroup[];
  periods: ParsedPeriod[];
  lessons: ParsedLesson[];
};

const DAYS: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  dushanba: 1, seshanba: 2, chorshanba: 3, payshanba: 4, juma: 5, shanba: 6,
};

const MIGALKA = /\((migalka|мигалка)\)/i;
const TIME_RANGE = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/;

function text(cell: ExcelJS.Cell): string {
  return clean(cell.text ?? "");
}

function parseGroupHeader(header: string): ParsedGroup {
  const name = clean(header);
  const [code, ...rest] = name.split(" ");
  const programKey = rest.join(" ");
  const ru = /\brus\b|\bYU\.r\b/i.test(programKey) && !/^rus tili$/i.test(programKey);
  return { name, code, programKey, language: ru ? "RU" : "UZ" };
}

function parseLessonType(raw: string): { lessonType: LessonType | null; alternating: boolean } {
  const v = raw.toUpperCase();
  if (v.startsWith("LEKS")) return { lessonType: "LECTURE", alternating: false };
  if (v.startsWith("SEM")) return { lessonType: "SEMINAR", alternating: false };
  if (v.startsWith("AMAL")) return { lessonType: "PRACTICE", alternating: false };
  if (v.startsWith("MIGALKA")) return { lessonType: null, alternating: true };
  return { lessonType: null, alternating: false };
}

export async function parseScheduleWorkbook(buffer: ArrayBuffer | Buffer): Promise<ParsedSchedule> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Excel faylida varaq topilmadi");

  // Group columns: every non-empty header from column C onward.
  const groupCols: { col: number; group: ParsedGroup }[] = [];
  ws.getRow(1).eachCell((cell, col) => {
    if (col < 3 || cell.isMerged && cell.master.address !== cell.address) return;
    const v = text(cell);
    if (v) groupCols.push({ col, group: parseGroupHeader(v) });
  });
  if (!groupCols.length) throw new Error("Guruh sarlavhalari topilmadi (1-qator)");

  const shift: Shift = groupCols.some((g) => /^\d+K-/i.test(g.group.code)) ? "KECHKI" : "KUNDUZGI";

  const periodsByTime = new Map<string, ParsedPeriod>();
  const rows: { timeKey: string; lesson: Omit<ParsedLesson, "period"> }[] = [];

  for (let r = 2; r <= ws.rowCount; r++) {
    const timeCell = ws.getCell(r, 2);
    if (timeCell.isMerged && timeCell.master.address !== timeCell.address) continue;
    const match = TIME_RANGE.exec(text(timeCell));
    if (!match) continue;

    const day = DAYS[text(ws.getCell(r, 1)).toLowerCase()];
    if (!day) continue;

    const [, startTime, endTime] = match;
    const timeKey = `${startTime}-${endTime}`;
    if (!periodsByTime.has(timeKey)) periodsByTime.set(timeKey, { number: 0, startTime, endTime });

    for (const { col, group } of groupCols) {
      const subject = text(ws.getCell(r, col));
      if (!subject) continue;
      // Some teacher cells carry an "(migalka)" / "(мигалка)" marker = every other week.
      const teacherRaw = text(ws.getCell(r + 1, col));
      const markedAlternating = MIGALKA.test(teacherRaw);
      const teacher = clean(teacherRaw.replace(MIGALKA, "")) || null;
      const typeRaw = text(ws.getCell(r + 2, col));
      const type = parseLessonType(typeRaw);
      const room = text(ws.getCell(r + 2, col + 1)) || null;
      rows.push({
        timeKey,
        lesson: {
          group: group.name,
          dayOfWeek: day,
          subject,
          teacher,
          room,
          lessonType: type.lessonType,
          alternating: type.alternating || markedAlternating,
        },
      });
    }
  }

  // Number periods (para) by start time.
  const periods = [...periodsByTime.values()]
    .sort((a, b) => a.startTime.localeCompare(b.startTime, undefined, { numeric: true }))
    .map((p, i) => ({ ...p, number: i + 1 }));
  const numberByTime = new Map(periods.map((p) => [`${p.startTime}-${p.endTime}`, p.number]));

  return {
    shift,
    groups: groupCols.map((g) => g.group),
    periods,
    lessons: rows.map(({ timeKey, lesson }) => ({ ...lesson, period: numberByTime.get(timeKey)! })),
  };
}

export function courseLanguage(subject: string): Language {
  return isCyrillic(subject) ? "RU" : "UZ";
}
