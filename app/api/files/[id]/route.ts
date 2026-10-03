import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { canManageCourse, canViewCourse, isModuleOpen } from "@/lib/course-access";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { serveStored } from "@/lib/serve-file";

// All course files go through here: the Blob store is private, so access is checked on every request.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });

  const { id } = await params;
  const material = await db.material.findFirst({
    where: { id, deletedAt: null, type: "FILE", module: { deletedAt: null } },
    include: { module: true },
  });
  if (!material?.fileUrl) return NextResponse.json({ error: t("common.notFound") }, { status: 404 });

  const { courseId } = material.module;
  const allowed =
    (await canManageCourse(session.user, courseId)) ||
    ((await canViewCourse(session.user, courseId)) && isModuleOpen(material.module));
  if (!allowed) return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });

  return serveStored(material.fileUrl, material.title, req.nextUrl.searchParams.get("download") === "1");
}
