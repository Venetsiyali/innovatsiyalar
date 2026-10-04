import Link from "next/link";
import { unstable_cache } from "next/cache";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { db } from "@/lib/db";
import { computeGradebook } from "@/lib/gradebook";
import { t } from "@/lib/i18n";
import { activeSemester } from "@/lib/schedule";

// Computing every course's gradebook is the heaviest query in the app: cache it for 5 minutes.
const courseStats = unstable_cache(
  async (semesterId: string) => {
    const live = { deletedAt: null };
    const courses = await db.course.findMany({
      where: {
        ...live,
        semesterId,
        OR: [{ assignments: { some: live } }, { scheduleSlots: { some: { attendance: { some: live } } } }],
      },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    const books = await Promise.all(courses.map((c) => computeGradebook(c.id)));
    return books.map(({ course, rows }) => ({
      id: course.id,
      name: course.name,
      students: rows.length,
      avgTotal: avg(rows.flatMap((r) => (r.total == null ? [] : [r.total]))),
      avgAttendance: avg(rows.flatMap((r) => (r.attendancePct == null ? [] : [r.attendancePct]))),
    }));
  },
  ["reports-course-stats"],
  { revalidate: 300 },
);

type TeacherAttendance = { teacherId: string | null; lessons: bigint; nb: bigint };

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

export default async function ReportsPage() {
  const semester = await activeSemester();
  if (!semester) return <p className="text-muted">{t("schedule.noActiveSemester")}</p>;
  const live = { deletedAt: null };

  const stats = await courseStats(semester.id);
  // Per teacher: lessons with attendance marked and NB (unexcused absences) given — one SQL query.
  const attendanceByTeacher = await db.$queryRaw<TeacherAttendance[]>`
    SELECT s."teacherId",
           COUNT(DISTINCT (a."slotId", a."date")) AS lessons,
           COUNT(*) FILTER (WHERE a."status" = 'ABSENT') AS nb
    FROM "Attendance" a JOIN "ScheduleSlot" s ON s."id" = a."slotId"
    WHERE a."deletedAt" IS NULL AND s."semesterId" = ${semester.id}
    GROUP BY s."teacherId"`;
  const attOf = new Map(attendanceByTeacher.map((r) => [r.teacherId, { lessons: Number(r.lessons), nb: Number(r.nb) }]));

  const [risky, teachers] = await Promise.all([
    db.attendance.groupBy({
      by: ["studentId"],
      where: { ...live, status: "ABSENT", slot: { semesterId: semester.id } },
      _count: true,
      having: { studentId: { _count: { gt: 3 } } },
    }),
    db.user.findMany({
      where: { ...live, role: "TEACHER", teachingCourses: { some: { ...live, course: { semesterId: semester.id } } } },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        lastLoginAt: true,
        _count: { select: { uploadedMaterials: { where: live }, gradesGiven: { where: live } } },
        teachingCourses: { where: live, select: { course: { select: { _count: { select: { assignments: { where: live } } } } } } },
      },
    }),
  ]);
  const riskyUsers = await db.user.findMany({
    where: { id: { in: risky.map((r) => r.studentId) } },
    select: { id: true, fullName: true, enrollments: { where: live, select: { group: { select: { name: true } } } } },
  });
  const riskyRows = risky
    .map((r) => ({ ...riskyUsers.find((u) => u.id === r.studentId)!, count: r._count }))
    .sort((a, b) => b.count - a.count);

  const teacherRows = teachers.map((u) => {
    const assignments = u.teachingCourses.reduce((n, c) => n + c.course._count.assignments, 0);
    const att = attOf.get(u.id) ?? { lessons: 0, nb: 0 };
    return { ...u, assignments, att, active: u._count.uploadedMaterials + assignments + u._count.gradesGiven + att.lessons > 0 };
  });
  const activeCount = teacherRows.filter((r) => r.active).length;

  return (
    <>
      <PageHeader title={t("reports.title")}>
        <Link href="/admin/reports/attendance" className="text-sm text-primary hover:underline">{t("reports.nbList")} →</Link>
      </PageHeader>
      <p className="mb-4 text-xs text-muted">{t("reports.cached")}</p>
      <div className="space-y-6">
        <Card className="space-y-3 p-5">
          <CardTitle>{t("reports.courses")}</CardTitle>
          <Table>
            <thead>
              <tr>
                <Th>{t("reports.course")}</Th>
                <Th className="text-right">{t("reports.students")}</Th>
                <Th className="text-right">{t("reports.avgTotal")}</Th>
                <Th className="text-right">{t("reports.attendance")}</Th>
              </tr>
            </thead>
            <tbody>
              {stats.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/admin/courses/${c.id}/gradebook`} className="text-primary hover:underline">{c.name}</Link>
                  </Td>
                  <Td className="text-right">{c.students}</Td>
                  <Td className="text-right">{c.avgTotal ?? "—"}</Td>
                  <Td className="text-right">{c.avgAttendance != null ? `${c.avgAttendance}%` : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card className="space-y-3 p-5">
          <CardTitle>{t("reports.atRisk")}</CardTitle>
          {riskyRows.length === 0 ? (
            <p className="text-sm text-muted">{t("reports.noRisk")}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {riskyRows.map((r) => (
                <li key={r.id} className="flex justify-between gap-2 py-2">
                  <Link href={`/admin/users/${r.id}`} className="text-primary hover:underline">
                    {r.fullName} <span className="text-muted">({r.enrollments.map((e) => e.group.name).join(", ")})</span>
                  </Link>
                  <Badge tone="red">
                    {t("reports.absences")}: {r.count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <CardTitle>{t("reports.teachers")}</CardTitle>
          <p className="text-sm text-muted">
            {t("reports.activeShare", {
              active: activeCount,
              total: teacherRows.length,
              pct: teacherRows.length ? Math.round((activeCount / teacherRows.length) * 100) : 0,
            })}
          </p>
          <Table>
            <thead>
              <tr>
                <Th>{t("reports.teacher")}</Th>
                <Th className="text-right">{t("reports.materials")}</Th>
                <Th className="text-right">{t("reports.assignments")}</Th>
                <Th className="text-right">{t("reports.graded")}</Th>
                <Th className="text-right">{t("reports.attLessons")}</Th>
                <Th className="text-right">{t("reports.nb")}</Th>
                <Th>{t("users.lastLogin")}</Th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <Link href={`/admin/reports/attendance?teacher=${r.id}`} className="text-primary hover:underline">{r.fullName}</Link>{" "}
                    {r.active && <Badge tone="green">{t("reports.active")}</Badge>}
                  </Td>
                  <Td className="text-right">{r._count.uploadedMaterials}</Td>
                  <Td className="text-right">{r.assignments}</Td>
                  <Td className="text-right">{r._count.gradesGiven}</Td>
                  <Td className="text-right">{r.att.lessons}</Td>
                  <Td className="text-right">{r.att.nb}</Td>
                  <Td className="text-muted">{r.lastLoginAt?.toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" }) ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>
    </>
  );
}
