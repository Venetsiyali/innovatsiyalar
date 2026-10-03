"use server";

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { ensureActiveSemester, importBundledSchedules } from "@/lib/initial-setup";
import { hashPassword } from "@/lib/password";

function sameSecret(given: string, expected: string | undefined): boolean {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** One-time bootstrap on a fresh database: first admin + semester + bundled timetable. */
export async function setupAction(_p: FormState, fd: FormData): Promise<FormState> {
  // Locked forever once any admin exists.
  if (await db.user.count({ where: { role: "ADMIN" } })) return { error: t("setup.alreadyDone") };
  if (!sameSecret(str(fd, "setupKey"), process.env.AUTH_SECRET)) return { error: t("setup.badKey") };

  const parsed = z
    .object({ fullName: z.string().min(2), email: z.string().toLowerCase().email(), password: z.string().min(8) })
    .safeParse({ fullName: str(fd, "fullName"), email: str(fd, "email"), password: str(fd, "password") });
  if (!parsed.success) return { error: t("password.tooShort") };
  if (parsed.data.password !== str(fd, "confirm")) return { error: t("password.mismatch") };

  const { email, fullName, password } = parsed.data;
  await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash: await hashPassword(password), mustChangePassword: false, isActive: true, deletedAt: null },
    create: { email, fullName, role: "ADMIN", passwordHash: await hashPassword(password), mustChangePassword: false },
  });

  const semester = await ensureActiveSemester(db);
  const results = await importBundledSchedules(db, semester.id);
  return {
    success: t("setup.done", {
      groups: results.reduce((n, r) => n + r.groups, 0),
      slots: results.reduce((n, r) => n + r.slots, 0),
    }),
  };
}
