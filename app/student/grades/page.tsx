import { auth } from "@/auth";
import { PageHeader } from "@/components/field";
import { Card } from "@/components/ui/card";
import { studentAssignmentsWhere } from "@/lib/assignments";
import { db } from "@/lib/db";
import { CATEGORIES, computeGradebook } from "@/lib/gradebook";
import { t } from "@/lib/i18n";

export default async function StudentGradesPage() {
  const session = (await auth())!;
  const userId = session.user.id;
  const live = { deletedAt: null };
  const courses = await db.course.findMany({
    where: {
      ...live,
      semester: { isActive: true },
      groups: { some: { ...live, group: { ...live, enrollments: { some: { userId, ...live, status: "ACTIVE" } } } } },
    },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  // Student sees only their own row (TZ 4.6).
  const books = await Promise.all(courses.map((c) => computeGradebook(c.id, { studentId: userId })));
  const visible = new Set((await db.assignment.findMany({ where: studentAssignmentsWhere(userId), select: { id: true } })).map((a) => a.id));

  return (
    <>
      <PageHeader title={t("gradebook.myGrades")} />
      {books.length === 0 && <p className="text-muted">{t("gradebook.noGrades")}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {books.map(({ course, assignments, rows }) => {
          const r = rows[0];
          if (!r) return null;
          return (
            <Card key={course.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{course.name}</p>
                <p className="text-2xl font-bold text-primary">{r.total ?? "—"}</p>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {CATEGORIES.map((c) => (
                  <div key={c} className="rounded-md bg-accent/50 p-2">
                    <p className="text-muted">{t(`assignments.${c}`)}</p>
                    <p className="font-semibold">{r.categoryPct[c] != null ? `${r.categoryPct[c]}%` : "—"}</p>
                  </div>
                ))}
                <div className="rounded-md bg-accent/50 p-2">
                  <p className="text-muted">{t("gradebook.attendance")}</p>
                  <p className={r.absences > 3 ? "font-semibold text-destructive" : "font-semibold"}>
                    {r.attendancePct != null ? `${r.attendancePct}%` : "—"}
                  </p>
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                {assignments
                  .filter((a) => visible.has(a.id) && r.cells[a.id] !== undefined)
                  .map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span className="truncate">{a.title}</span>
                      <span className="shrink-0 text-muted">
                        {r.cells[a.id] ? `${r.cells[a.id]!.effective} / ${a.maxScore}` : t("gradebook.notGraded")}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
