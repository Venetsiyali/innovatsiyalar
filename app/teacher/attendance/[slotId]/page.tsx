import { forbidden, notFound } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { canManageCourse } from "@/lib/course-access";
import { formatDate, isoDate, parseDate, todayDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { saveAttendanceAction } from "@/lib/gradebook-actions";
import { t } from "@/lib/i18n";
import { slotInclude } from "@/lib/schedule";

const STATUSES = ["PRESENT", "ABSENT", "EXCUSED"] as const;
const TONE = { PRESENT: "peer-checked:bg-emerald-600", ABSENT: "peer-checked:bg-destructive", EXCUSED: "peer-checked:bg-amber-500" };

export default async function MarkAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ slotId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const [{ slotId }, { date: dateParam }, session] = await Promise.all([params, searchParams, auth()]);
  const slot = await db.scheduleSlot.findFirst({ where: { id: slotId, deletedAt: null }, include: slotInclude });
  if (!slot) notFound();
  if (slot.teacherId !== session!.user.id && !(await canManageCourse(session!.user, slot.courseId))) forbidden();
  const date = parseDate(dateParam) ?? todayDate();

  const [students, existing] = await Promise.all([
    db.enrollment.findMany({
      where: { groupId: slot.groupId, deletedAt: null, status: "ACTIVE", user: { deletedAt: null, role: "STUDENT" } },
      select: { user: { select: { id: true, fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    db.attendance.findMany({ where: { slotId, date, deletedAt: null } }),
  ]);
  const statusOf = new Map(existing.map((a) => [a.studentId, a.status]));

  return (
    <>
      <PageHeader title={`${slot.course.name} — ${slot.group.name}`} />
      <p className="mb-4 text-sm text-muted">
        {t(`days.${slot.dayOfWeek}`)}, {formatDate(date)} · {slot.period.number}-para ({slot.period.startTime})
      </p>
      {students.length === 0 ? (
        <p className="text-muted">{t("attendance.noStudents")}</p>
      ) : (
        <ActionForm action={saveAttendanceAction.bind(null, slot.id, isoDate(date))}>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {students.map(({ user }, i) => (
              <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="text-sm">
                  {i + 1}. {user.fullName}
                </span>
                {/* One tap per student: segmented radio buttons, "Keldi" preselected. */}
                <div className="flex overflow-hidden rounded-md border border-border text-xs">
                  {STATUSES.map((st) => (
                    <label key={st} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`s:${user.id}`}
                        value={st}
                        defaultChecked={(statusOf.get(user.id) ?? "PRESENT") === st}
                        className="peer sr-only"
                      />
                      <span className={`block px-3 py-2 peer-checked:text-white ${TONE[st]}`}>{t(`attendance.${st}`)}</span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <Button type="submit" className="w-full sm:w-auto">{t("attendance.save")}</Button>
        </ActionForm>
      )}
    </>
  );
}
