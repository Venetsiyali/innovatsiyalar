"use server";

import type { MaterialType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { canManageCourse } from "@/lib/course-access";
import { parseLocalDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { checkFile, extOf, MIME_BY_EXT, youtubeId } from "@/lib/files";
import { str, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { coursePrefix, keyOf, storedSize } from "@/lib/storage";

// Every action re-checks that the caller manages the course (admin or assigned teacher).
async function requireManager(courseId: string) {
  const session = await auth();
  if (!session?.user || !(await canManageCourse(session.user, courseId))) throw new Error(t("errors.forbidden"));
  return session;
}

async function moduleCourse(moduleId: string) {
  const mod = await db.module.findFirst({ where: { id: moduleId, deletedAt: null } });
  if (!mod) throw new Error(t("common.notFound"));
  return mod;
}

function refresh() {
  // Content is shown under several role paths; revalidate them all.
  for (const p of ["/teacher/my-courses", "/student/courses", "/admin/courses"]) revalidatePath(p, "layout");
}

// ── Modules ──

export async function saveModuleAction(courseId: string, moduleId: string | null, _p: FormState, fd: FormData): Promise<FormState> {
  await requireManager(courseId);
  const title = str(fd, "title");
  if (!title) return { error: t("common.required") };
  const data = { title, opensAt: parseLocalDateTime(str(fd, "opensAt")), isHidden: fd.get("isHidden") === "on" };
  if (moduleId) {
    await db.module.update({ where: { id: moduleId, courseId }, data });
  } else {
    const last = await db.module.aggregate({ where: { courseId, deletedAt: null }, _max: { position: true } });
    await db.module.create({ data: { ...data, courseId, position: (last._max.position ?? -1) + 1 } });
  }
  refresh();
  return { success: t("common.saved") };
}

export async function deleteModuleAction(moduleId: string, _p: FormState, _fd: FormData): Promise<FormState> {
  const mod = await moduleCourse(moduleId);
  await requireManager(mod.courseId);
  const now = new Date();
  await db.$transaction([
    db.module.update({ where: { id: moduleId }, data: { deletedAt: now } }),
    db.material.updateMany({ where: { moduleId, deletedAt: null }, data: { deletedAt: now } }),
  ]);
  refresh();
  return { success: t("common.deleted") };
}

export async function moveModuleAction(moduleId: string, direction: -1 | 1, _p: FormState, _fd: FormData): Promise<FormState> {
  const mod = await moduleCourse(moduleId);
  await requireManager(mod.courseId);
  const siblings = await db.module.findMany({ where: { courseId: mod.courseId, deletedAt: null }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
  const i = siblings.findIndex((m) => m.id === moduleId);
  const j = i + direction;
  if (j < 0 || j >= siblings.length) return {};
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
  await db.$transaction(siblings.map((m, position) => db.module.update({ where: { id: m.id }, data: { position } })));
  refresh();
  return {};
}

// ── Materials ──

async function nextPosition(moduleId: string) {
  const last = await db.material.aggregate({ where: { moduleId, deletedAt: null }, _max: { position: true } });
  return (last._max.position ?? -1) + 1;
}

/** Link, YouTube video or text page. */
export async function addSimpleMaterialAction(moduleId: string, type: Exclude<MaterialType, "FILE">, _p: FormState, fd: FormData): Promise<FormState> {
  const mod = await moduleCourse(moduleId);
  const session = await requireManager(mod.courseId);
  const title = str(fd, "title");
  const url = str(fd, "url");
  const body = str(fd, "body");
  if (!title) return { error: t("common.required") };
  if (type === "LINK" && !/^https?:\/\/\S+$/i.test(url)) return { error: t("content.badUrl") };
  if (type === "VIDEO" && !youtubeId(url)) return { error: t("content.badYoutube") };
  if (type === "PAGE" && !body) return { error: t("common.required") };

  await db.material.create({
    data: {
      moduleId,
      type,
      title,
      url: type === "PAGE" ? null : url,
      body: type === "PAGE" ? body : null,
      uploadedById: session.user.id,
      position: await nextPosition(moduleId),
    },
  });
  refresh();
  return { success: t("common.saved") };
}

/** Register a file the browser already uploaded to storage (optionally as a new version). */
export async function addFileMaterialAction(
  moduleId: string,
  file: { url: string; name: string; previousId?: string },
): Promise<{ error?: string }> {
  const mod = await moduleCourse(moduleId);
  const session = await requireManager(mod.courseId);

  // The upload must sit under this course's prefix and actually exist.
  if (!keyOf(file.url).startsWith(coursePrefix(mod.courseId))) return { error: t("errors.forbidden") };
  const size = await storedSize(file.url);
  if (size == null) return { error: t("content.fileMissing") };
  const problem = checkFile(file.name, size);
  if (problem) return { error: t(problem) };

  const previous = file.previousId
    ? await db.material.findFirst({ where: { id: file.previousId, moduleId, type: "FILE", deletedAt: null } })
    : null;
  await db.material.create({
    data: {
      moduleId,
      type: "FILE",
      title: previous?.title ?? file.name,
      fileUrl: file.url,
      sizeBytes: size,
      mimeType: MIME_BY_EXT[extOf(file.name)],
      uploadedById: session.user.id,
      // New version: old row stays (TZ: versions are never deleted) and the new one takes its place.
      version: previous ? previous.version + 1 : 1,
      previousId: previous?.id ?? null,
      position: previous?.position ?? (await nextPosition(moduleId)),
    },
  });
  refresh();
  return {};
}

export async function deleteMaterialAction(materialId: string, _p: FormState, _fd: FormData): Promise<FormState> {
  const material = await db.material.findFirst({ where: { id: materialId, deletedAt: null }, include: { module: true } });
  if (!material) return { error: t("common.notFound") };
  await requireManager(material.module.courseId);
  // Soft-delete the whole version chain.
  const ids = [material.id];
  for (let prev = material.previousId; prev; ) {
    ids.push(prev);
    prev = (await db.material.findUnique({ where: { id: prev }, select: { previousId: true } }))?.previousId ?? null;
  }
  await db.material.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });
  refresh();
  return { success: t("common.deleted") };
}
