import Link from "next/link";
import type { LessonPeriod } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { addDays, formatDate, isoDate, todayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import type { ChangeInfo, SlotWithRefs } from "@/lib/schedule";
import { cn } from "@/lib/utils";

type Mode = "group" | "teacher" | "room";

type Props = {
  slots: SlotWithRefs[];
  monday: Date;
  changes: Map<string, ChangeInfo>;
  /** What the view is "about" — that field is omitted from each card. */
  mode: Mode;
  /** Optional link for each lesson (admin edit page). */
  hrefFor?: (slot: SlotWithRefs) => string;
};

function LessonCard({ slot, change, mode, href }: { slot: SlotWithRefs; change?: ChangeInfo; mode: Mode; href?: string }) {
  const lines = [
    mode !== "group" && slot.group.name,
    mode !== "teacher" && slot.teacher?.fullName,
    mode !== "room" && slot.room && `${t("schedule.room")}: ${slot.room.name}`,
  ].filter(Boolean) as string[];

  const body = (
    <div
      className={cn(
        "space-y-0.5 rounded-md border-l-4 bg-accent/60 p-2 text-xs",
        change?.type === "CANCELLED" ? "border-destructive bg-red-50 opacity-80" : change ? "border-amber-500 bg-amber-50" : "border-primary",
      )}
    >
      <p className={cn("font-semibold leading-snug", change?.type === "CANCELLED" && "line-through")}>{slot.course.name}</p>
      {lines.map((l) => (
        <p key={l} className="text-muted">{l}</p>
      ))}
      <div className="flex flex-wrap gap-1 pt-0.5">
        {slot.lessonType && <Badge tone="gray">{t(`schedule.${slot.lessonType}`)}</Badge>}
        {slot.alternating && <Badge tone="gray">{t("schedule.alternatingShort")}</Badge>}
        {change && (
          <Badge tone={change.type === "CANCELLED" ? "red" : "default"}>
            {t(change.type === "CANCELLED" ? "schedule.cancelled" : "schedule.moved")}
          </Badge>
        )}
      </div>
      {change?.type === "MOVED" && (
        <p className="text-amber-700">
          {[change.newDate && t("schedule.movedTo", { date: formatDate(change.newDate) }), change.newPeriodLabel, change.newRoomName]
            .filter(Boolean)
            .join(", ")}
        </p>
      )}
      {change && <p className="italic text-muted">{change.reason}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

export function WeekGrid({ slots, monday, changes, mode, hrefFor }: Props) {
  if (!slots.length) return <p className="rounded-xl border border-border bg-card p-6 text-muted">{t("schedule.empty")}</p>;

  // Periods actually used (a teacher may span both shifts), ordered by start time.
  const periods = [...new Map(slots.map((s) => [s.periodId, s.period])).values()].sort((a, b) =>
    a.startTime.localeCompare(b.startTime, undefined, { numeric: true }),
  );
  const days = [1, 2, 3, 4, 5, ...(slots.some((s) => s.dayOfWeek === 6) ? [6] : [])];
  const today = isoDate(todayDate());
  const cell = (day: number, period: LessonPeriod) => slots.filter((s) => s.dayOfWeek === day && s.periodId === period.id);
  const card = (s: SlotWithRefs, day: number) => (
    <LessonCard
      key={s.id}
      slot={s}
      mode={mode}
      href={hrefFor?.(s)}
      change={changes.get(`${s.id}|${isoDate(addDays(monday, day - 1))}`)}
    />
  );

  return (
    <>
      {/* Desktop: week table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block print:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr>
              <th className="w-24 border-b border-border p-2 text-left font-medium">{t("schedule.period")}</th>
              {days.map((d) => {
                const date = addDays(monday, d - 1);
                return (
                  <th key={d} className={cn("border-b border-border p-2 text-left font-medium", isoDate(date) === today && "bg-accent")}>
                    {t(`days.${d}`)}
                    <span className="block text-xs font-normal text-muted">{formatDate(date)}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="align-top">
                <td className="border-b border-border p-2 text-xs">
                  <p className="font-semibold">{p.number}-para</p>
                  <p className="text-muted">
                    {p.startTime}–{p.endTime}
                  </p>
                </td>
                {days.map((d) => (
                  <td key={d} className="space-y-1 border-b border-l border-border p-1.5">
                    {cell(d, p).map((s) => card(s, d))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: one card per day, today first highlighted */}
      <div className="space-y-3 md:hidden print:hidden">
        {days.map((d) => {
          const date = addDays(monday, d - 1);
          const daySlots = periods.flatMap((p) => cell(d, p).map((s) => ({ s, p })));
          return (
            <section
              key={d}
              className={cn("rounded-xl border border-border bg-card p-3", isoDate(date) === today && "ring-2 ring-primary")}
            >
              <h3 className="mb-2 font-semibold">
                {t(`days.${d}`)} <span className="text-sm font-normal text-muted">{formatDate(date)}</span>
              </h3>
              {daySlots.length === 0 ? (
                <p className="text-sm text-muted">—</p>
              ) : (
                <ul className="space-y-2">
                  {daySlots.map(({ s, p }) => (
                    <li key={s.id} className="flex gap-3">
                      <div className="w-14 shrink-0 text-xs">
                        <p className="font-semibold">{p.startTime}</p>
                        <p className="text-muted">{p.endTime}</p>
                      </div>
                      <div className="flex-1">{card(s, d)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

export function WeekNav({ monday, params }: { monday: Date; params: Record<string, string> }) {
  const href = (d: Date | null) => `?${new URLSearchParams({ ...params, ...(d && { week: isoDate(d) }) })}`;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm print:hidden">
      <Link className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-accent" href={href(addDays(monday, -7))}>
        ← {t("schedule.prevWeek")}
      </Link>
      <Link className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-accent" href={href(null)}>
        {t("schedule.thisWeek")}
      </Link>
      <Link className="rounded-md border border-border bg-card px-3 py-1.5 hover:bg-accent" href={href(addDays(monday, 7))}>
        {t("schedule.nextWeek")} →
      </Link>
      <span className="text-muted">
        {t("schedule.weekOf", { from: formatDate(monday), to: formatDate(addDays(monday, 5)) })}
      </span>
    </div>
  );
}
