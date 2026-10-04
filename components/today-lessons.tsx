import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { dayOfWeek, formatDate, isoDate, mondayOf, todayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { activeSemester, changesForWeek, findSlots, type SlotFilter } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/** Compact "today" list for dashboards — fits one phone screen (TZ 7). */
export async function TodayLessons({ filter, attendanceLinks }: { filter: SlotFilter; attendanceLinks?: boolean }) {
  const semester = await activeSemester();
  const today = todayDate();
  const slots = semester ? (await findSlots(semester.id, filter)).filter((s) => s.dayOfWeek === dayOfWeek(today)) : [];
  const changes = await changesForWeek(slots.map((s) => s.id), mondayOf(today));

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">
        {t("dashboard.today")} <span className="text-sm font-normal text-muted">{t(`days.${dayOfWeek(today)}`)}, {formatDate(today)}</span>
      </h2>
      {slots.length === 0 ? (
        <p className="text-muted">{t("dashboard.noLessonsToday")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {slots.map((s) => {
            const change = changes.get(`${s.id}|${isoDate(today)}`);
            return (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <div className="w-12 shrink-0 text-xs">
                  <p className="font-semibold">{s.period.startTime}</p>
                  <p className="text-muted">{s.period.endTime}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", change?.type === "CANCELLED" && "line-through")}>{s.course.name}</p>
                  <p className="truncate text-xs text-muted">
                    {[attendanceLinks ? s.group.name : s.teacher?.fullName, s.room && `${t("schedule.room")}: ${s.room.name}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {change && <Badge tone={change.type === "CANCELLED" ? "red" : "default"}>{t(change.type === "CANCELLED" ? "schedule.cancelled" : "schedule.moved")}</Badge>}
                {attendanceLinks && !change && (
                  <Link href={`/teacher/attendance/${s.id}?date=${isoDate(today)}`} className="text-sm text-primary hover:underline">
                    {t("attendance.mark")}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
