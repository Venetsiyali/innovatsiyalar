import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canManageCourse } from "@/lib/course-access";
import { checkFile, sanitizeFileName } from "@/lib/files";
import { t } from "@/lib/i18n";
import { coursePrefix, saveLocal, storageDriver } from "@/lib/storage";

// Development fallback when no Blob token is configured: store under ./uploads.
export async function POST(request: Request) {
  if (storageDriver() !== "local") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });

  const fd = await request.formData();
  const file = fd.get("file");
  const courseId = String(fd.get("courseId") ?? "");
  if (!(file instanceof File) || !courseId) return NextResponse.json({ error: t("common.required") }, { status: 400 });
  if (!(await canManageCourse(session.user, courseId))) return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
  const problem = checkFile(file.name, file.size);
  if (problem) return NextResponse.json({ error: t(problem) }, { status: 400 });

  const key = `${coursePrefix(courseId)}${randomUUID().slice(0, 8)}-${sanitizeFileName(file.name)}`;
  const url = await saveLocal(key, Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url });
}
