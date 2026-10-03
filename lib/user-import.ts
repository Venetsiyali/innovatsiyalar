import "server-only";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { clean, keyOf } from "@/lib/schedule-import/normalize";

export type ImportedUser = { fullName: string; email: string; role: Role; group: string | null; password: string };
export type UserImportResult = { created: ImportedUser[]; errors: string[] } | { error: string };

// Accepted header spellings → field.
const HEADERS: Record<string, "fullName" | "email" | "role" | "group" | "phone"> = {
  "f.i.sh": "fullName", fish: "fullName", "f.i.o": "fullName", fio: "fullName", "ism familiya": "fullName", "full name": "fullName",
  email: "email", "e-mail": "email", pochta: "email",
  rol: "role", role: "role",
  guruh: "group", group: "group",
  telefon: "phone", phone: "phone", tel: "phone",
};

const ROLE_WORDS: Record<string, Role> = {
  talaba: "STUDENT", student: "STUDENT", "o'qituvchi": "TEACHER", oqituvchi: "TEACHER", teacher: "TEACHER", admin: "ADMIN",
};

const email = z.string().email();

async function readSheet(fileName: string, buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  if (fileName.toLowerCase().endsWith(".csv")) {
    await wb.csv.read(Readable.from(Buffer.from(buffer)));
  } else {
    await wb.xlsx.load(buffer);
  }
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: true }, (row) => {
    const cells: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(clean(row.getCell(c).text ?? ""));
    rows.push(cells);
  });
  return rows;
}

export async function importUsers(fileName: string, buffer: ArrayBuffer): Promise<UserImportResult> {
  let rows: string[][];
  try {
    rows = await readSheet(fileName, buffer);
  } catch {
    return { error: t("import.badFile") };
  }
  const header = (rows[0] ?? []).map((h) => HEADERS[keyOf(h)]);
  if (!header.includes("fullName") || !header.includes("email")) return { error: t("import.noHeader") };

  const groups = await db.group.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  const groupByName = new Map(groups.map((g) => [keyOf(g.name), g.id]));
  const existing = new Set(
    (await db.user.findMany({ select: { email: true } })).map((u) => u.email),
  );

  const created: ImportedUser[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const rec: Partial<Record<(typeof HEADERS)[string], string>> = {};
    rows[i].forEach((v, c) => {
      if (header[c] && v) rec[header[c]] = v;
    });
    if (!Object.keys(rec).length) continue; // blank line
    const row = i + 1;
    const mail = (rec.email ?? "").toLowerCase();
    const fail = (reason: string) => errors.push(t("import.rowError", { row, reason }));

    if (!rec.fullName) { fail(t("import.noName")); continue; }
    if (!email.safeParse(mail).success) { fail(t("import.badEmail")); continue; }
    if (existing.has(mail)) { fail(t("import.exists")); continue; }
    const role = ROLE_WORDS[keyOf(rec.role ?? "talaba")] ?? "STUDENT";
    const groupId = rec.group ? groupByName.get(keyOf(rec.group)) : undefined;
    if (rec.group && !groupId) { fail(t("import.noGroup", { group: rec.group })); continue; }

    const password = generateTempPassword();
    const user = await db.user.create({
      data: {
        fullName: rec.fullName,
        email: mail,
        role,
        phone: rec.phone ?? null,
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    if (groupId && role === "STUDENT") await db.enrollment.create({ data: { userId: user.id, groupId } });
    existing.add(mail);
    created.push({ fullName: rec.fullName, email: mail, role, group: rec.group ?? null, password });
  }

  return { created, errors };
}
