import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { studentAssignmentsWhere } from "@/lib/assignments";
import { canManageCourse } from "@/lib/course-access";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { serveStored } from "@/lib/serve-file";

// Assignment attachment: course managers, or students the assignment is given to.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
  const { id } = await params;
  const a = await db.assignment.findFirst({ where: { id, deletedAt: null } });
  if (!a?.attachmentUrl) return NextResponse.json({ error: t("common.notFound") }, { status: 404 });
  const allowed =
    (await canManageCourse(session.user, a.courseId)) ||
    (session.user.role === "STUDENT" && !!(await db.assignment.findFirst({ where: { id, ...studentAssignmentsWhere(session.user.id) } })));
  if (!allowed) return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
  return serveStored(a.attachmentUrl, a.title, req.nextUrl.searchParams.get("download") === "1");
}
