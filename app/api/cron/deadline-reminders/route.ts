import { NextResponse, type NextRequest } from "next/server";
import { assignmentStudents } from "@/lib/assignments";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notify";
import { t } from "@/lib/i18n";

// Vercel Cron (vercel.json) calls this with `Authorization: Bearer $CRON_SECRET`.
// TZ 4.5: remind students who haven't submitted when ≤ 24 hours are left.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 3_600_000);
  const assignments = await db.assignment.findMany({
    where: { deletedAt: null, startsAt: { lte: now }, deadline: { gt: now, lte: soon } },
  });

  let sent = 0;
  for (const a of assignments) {
    const link = `/student/assignments/${a.id}`;
    const [students, submitted, reminded] = await Promise.all([
      assignmentStudents(a.id),
      db.submission.findMany({ where: { assignmentId: a.id, deletedAt: null }, select: { studentId: true } }),
      db.notification.findMany({ where: { type: "deadline_reminder", link }, select: { userId: true } }),
    ]);
    // Skip students who already submitted or were already reminded (cron may run more than once).
    const skip = new Set([...submitted.map((s) => s.studentId), ...reminded.map((r) => r.userId)]);
    const targets = students.filter((s) => !skip.has(s.id));
    if (!targets.length) continue;
    const count = await notifyUsers(targets.map((s) => ({
        userId: s.id,
        type: "deadline_reminder",
        link,
        message: t("assignments.reminderNotice", { title: a.title, date: formatDateTime(a.deadline) }),
      })));
    sent += count;
  }
  return NextResponse.json({ assignments: assignments.length, sent });
}
