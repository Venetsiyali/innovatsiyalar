"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { isUniqueError, str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { assertRole } from "@/lib/permissions";

const PATH = "/admin/structure";

async function guarded(fn: () => Promise<unknown>, okKey = "common.saved"): Promise<FormState> {
  await assertRole("ADMIN");
  try {
    await fn();
  } catch (e) {
    if (isUniqueError(e)) return { error: t("structure.codeTaken") };
    throw e;
  }
  revalidatePath(PATH);
  return { success: t(okKey) };
}

// ── Faculties ──
export async function saveFacultyAction(id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  const data = { name: str(fd, "name"), code: str(fd, "code").toUpperCase() };
  if (!data.name || !data.code) return { error: t("common.required") };
  return guarded(() => (id ? db.faculty.update({ where: { id }, data }) : db.faculty.create({ data })));
}

export async function deleteFacultyAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  if (await db.program.count({ where: { facultyId: id, deletedAt: null } })) return { error: t("structure.hasChildren") };
  return guarded(() => db.faculty.update({ where: { id }, data: { deletedAt: new Date() } }), "common.deleted");
}

// ── Programs ──
export async function saveProgramAction(id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  const data = { name: str(fd, "name"), code: str(fd, "code").toUpperCase(), facultyId: str(fd, "facultyId") };
  if (!data.name || !data.code || !data.facultyId) return { error: t("common.required") };
  return guarded(() => (id ? db.program.update({ where: { id }, data }) : db.program.create({ data })));
}

export async function deleteProgramAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  if (await db.group.count({ where: { programId: id, deletedAt: null } })) return { error: t("structure.hasChildren") };
  return guarded(() => db.program.update({ where: { id }, data: { deletedAt: new Date() } }), "common.deleted");
}

// ── Semesters ──
export async function saveSemesterAction(id: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const startDate = new Date(str(fd, "startDate"));
  const endDate = new Date(str(fd, "endDate"));
  if (!name || Number.isNaN(+startDate) || Number.isNaN(+endDate)) return { error: t("common.required") };
  if (endDate <= startDate) return { error: t("structure.badDates") };
  const data = { name, startDate, endDate };
  return guarded(() => (id ? db.semester.update({ where: { id }, data }) : db.semester.create({ data })));
}

/** Exactly one semester is active at a time. */
export async function activateSemesterAction(id: string, _p: FormState, _fd: FormData): Promise<FormState> {
  return guarded(() =>
    db.$transaction([
      db.semester.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      db.semester.update({ where: { id }, data: { isActive: true } }),
    ]),
  );
}
