import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { effectiveScore, submissionWindow } from "@/lib/assignment-rules";
import { studentAssignmentsWhere } from "@/lib/assignments";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export async function loadStudentAssignments(userId: string) {
  return db.assignment.findMany({
    where: studentAssignmentsWhere(userId),
    orderBy: { deadline: "asc" },
    include: {
      course: { select: { name: true } },
      submissions: { where: { studentId: userId, deletedAt: null }, include: { grade: true } },
    },
  });
}

type Row = Awaited<ReturnType<typeof loadStudentAssignments>>[number];

export function StatusBadge({ a }: { a: Row }) {
  const sub = a.submissions[0];
  if (sub?.grade) {
    return <Badge tone="green">{t("assignments.graded")}: {effectiveScore(sub.grade.score, sub.isLate, a.latePenaltyPct)}/{a.maxScore}</Badge>;
  }
  if (sub) return <Badge>{t("assignments.submitted")}</Badge>;
  return submissionWindow(a).state === "closed" ? (
    <Badge tone="red">{t("assignments.overdue")}</Badge>
  ) : (
    <Badge tone="gray">{t("assignments.notSubmitted")}</Badge>
  );
}

/** Compact phone-first list of assignments sorted by deadline. */
export function DeadlineList({ rows }: { rows: Row[] }) {
  const now = Date.now();
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((a) => {
        const soon = a.deadline.getTime() - now < 86_400_000 && a.deadline.getTime() > now && !a.submissions[0];
        return (
          <li key={a.id}>
            <Link href={`/student/assignments/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-accent/40">
              <div className="min-w-0">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted">{a.course.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={cn("text-xs", soon ? "font-semibold text-destructive" : "text-muted")}>
                  {t("assignments.due", { date: formatDateTime(a.deadline) })}
                </span>
                <StatusBadge a={a} />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
