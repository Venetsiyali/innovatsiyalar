import Link from "next/link";
import { auth } from "@/auth";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dayOfWeek, formatDate, isoDate, parseDate, todayDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { activeSemester, findSlots } from "@/lib/schedule";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const [{ date: dateParam }, session] = await Promise.all([searchParams, auth()]);
  const today = todayDate();
  const date = parseDate(dateParam) ?? today;
  const semester = await activeSemester();
  const slots = semester ? (await findSlots(semester.id, { teacherId: session!.user.id })).filter((s) => s.dayOfWeek === dayOfWeek(date)) : [];
  const ids = slots.map((s) => s.id);
  const [cancelled, marked] = await Promise.all([
    db.scheduleChange.findMany({ where: { slotId: { in: ids }, date, type: "CANCELLED", deletedAt: null }, select: { slotId: true } }),
    db.attendance.groupBy({ by: ["slotId"], where: { slotId: { in: ids }, date, deletedAt: null }, _count: true }),
  ]);
  const cancelledIds = new Set(cancelled.map((c) => c.slotId));
  const markedIds = new Set(marked.map((m) => m.slotId));

  return (
    <>
      <PageHeader title={t("attendance.title")} />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t("attendance.pickDate")}</span>
          <Input type="date" name="date" defaultValue={isoDate(date)} max={isoDate(today)} className="w-48" />
        </label>
        <Button type="submit" variant="outline">{t("schedule.show")}</Button>
      </form>
      <p className="mb-2 font-medium">
        {t(`days.${dayOfWeek(date)}`)}, {formatDate(date)}
      </p>
      {slots.length === 0 ? (
        <p className="text-muted">{t("attendance.noLessons")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {slots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div>
                <p className="font-medium">
                  {s.period.number}-para ({s.period.startTime}) · {s.course.name}
                </p>
                <p className="text-xs text-muted">
                  {s.group.name}
                  {s.room && ` · ${t("schedule.room")}: ${s.room.name}`}
                </p>
              </div>
              {cancelledIds.has(s.id) ? (
                <Badge tone="red">{t("schedule.cancelled")}</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge tone={markedIds.has(s.id) ? "green" : "gray"}>
                    {t(markedIds.has(s.id) ? "attendance.marked" : "attendance.notMarked")}
                  </Badge>
                  <Link href={`/teacher/attendance/${s.id}?date=${isoDate(date)}`}>
                    <Button size="sm">{t("attendance.mark")}</Button>
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
