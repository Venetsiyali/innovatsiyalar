import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { canManageCourse } from "@/lib/course-access";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { serveStored } from "@/lib/serve-file";

// Submitted work: the student who submitted it, or the course's teachers/admin.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: t("errors.unauthorized") }, { status: 401 });
  const { id } = await params;
  const s = await db.submission.findFirst({
    where: { id, deletedAt: null },
    include: { assignment: true, student: { select: { fullName: true } } },
  });
  if (!s?.fileUrl) return NextResponse.json({ error: t("common.notFound") }, { status: 404 });
  const allowed = s.studentId === session.user.id || (await canManageCourse(session.user, s.assignment.courseId));
  if (!allowed) return NextResponse.json({ error: t("errors.forbidden") }, { status: 403 });
  return serveStored(s.fileUrl, `${s.student.fullName} - ${s.assignment.title}`, req.nextUrl.searchParams.get("download") === "1");
}
