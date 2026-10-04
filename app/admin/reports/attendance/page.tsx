import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { activeSemester } from "@/lib/schedule";

const LIMIT = 300;

/** Who got an NB, in which lesson, marked in whose class — filterable by teacher and group. */
export default async function NbReportPage({
  searchParams,
}: {
  searchParams: Promise<{ teacher?: string; group?: string; status?: string }>;
}) {
  const { teacher = "", group = "", status = "ABSENT" } = await searchParams;
  const semester = await activeSemester();
  if (!semester) return <p className="text-muted">{t("schedule.noActiveSemester")}</p>;
  const live = { deletedAt: null };
  const st = status === "EXCUSED" ? "EXCUSED" : "ABSENT";

  const where: Prisma.AttendanceWhereInput = {
    ...live,
    status: st,
    slot: { semesterId: semester.id, ...(teacher && { teacherId: teacher }), ...(group && { groupId: group }) },
  };
  const [rows, total, perStudent, teachers, groups] = await Promise.all([
    db.attendance.findMany({
      where,
      orderBy: [{ date: "desc" }],
      take: LIMIT,
      include: {
        student: { select: { fullName: true } },
        slot: { include: { course: { select: { name: true } }, group: { select: { name: true } }, teacher: { select: { fullName: true } }, period: true } },
      },
    }),
    db.attendance.count({ where }),
    db.attendance.groupBy({ by: ["studentId"], where, _count: true, orderBy: { _count: { studentId: "desc" } }, take: 30 }),
    db.user.findMany({ where: { ...live, role: "TEACHER" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    db.group.findMany({ where: live, orderBy: [{ shift: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const names = new Map(
    (await db.user.findMany({ where: { id: { in: perStudent.map((p) => p.studentId) } }, select: { id: true, fullName: true } })).map((u) => [u.id, u.fullName]),
  );

  return (
    <>
      <PageHeader title={t("reports.nbTitle")} />
      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="teacher" defaultValue={teacher} className="w-64">
          <option value="">{t("reports.allTeachers")}</option>
          {teachers.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </Select>
        <Select name="group" defaultValue={group} className="w-56">
          <option value="">{t("reports.allGroups")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </Select>
        <Select name="status" defaultValue={st} className="w-40">
          <option value="ABSENT">{t("attendance.ABSENT")}</option>
          <option value="EXCUSED">{t("attendance.EXCUSED")}</option>
        </Select>
        <Button type="submit" variant="outline">{t("common.filter")}</Button>
      </form>
      <p className="mb-3 text-sm font-medium">{t("reports.total", { count: total })}</p>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <Table>
            <thead>
              <tr>
                <Th>{t("reports.date")}</Th>
                <Th>{t("gradebook.student")}</Th>
                <Th>{t("reports.course")}</Th>
                <Th>{t("reports.teacher")}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap">
                    {formatDate(a.date)}
                    <span className="block text-xs text-muted">{a.slot.period.number}-para</span>
                  </Td>
                  <Td>
                    {a.student.fullName}
                    <span className="block text-xs text-muted">{a.slot.group.name}</span>
                  </Td>
                  <Td>{a.slot.course.name}</Td>
                  <Td>{a.slot.teacher?.fullName ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {total > LIMIT && <p className="text-xs text-muted">{t("reports.shown", { count: LIMIT })}</p>}
        </div>
        <Card className="h-fit space-y-2 p-4">
          <CardTitle className="text-base">{t("reports.byStudent")}</CardTitle>
          <ul className="divide-y divide-border text-sm">
            {perStudent.map((p) => (
              <li key={p.studentId} className="flex justify-between py-1.5">
                <span>{names.get(p.studentId)}</span>
                <span className={p._count > 3 && st === "ABSENT" ? "font-semibold text-destructive" : ""}>{p._count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
