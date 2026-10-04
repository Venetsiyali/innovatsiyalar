import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/field";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { WeekGrid, WeekNav } from "@/components/week-grid";
import { mondayOf, parseDate, todayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { activeSemester, changesForWeek, findSlots, type SlotFilter, type SlotWithRefs } from "@/lib/schedule";

/** Read-only personal schedule (teacher or student). */
export async function MySchedule({
  filter,
  mode,
  week,
  exportHref,
  hrefFor,
  extra,
}: {
  filter: SlotFilter;
  mode: "group" | "teacher";
  week?: string;
  exportHref?: string;
  /** Optional link per lesson (teacher → propose a change). */
  hrefFor?: (slot: SlotWithRefs) => string;
  /** Extra header content (buttons, hints). */
  extra?: React.ReactNode;
}) {
  const semester = await activeSemester();
  if (!semester) return <p className="text-muted">{t("schedule.noActiveSemester")}</p>;
  const monday = mondayOf(parseDate(week) ?? todayDate());
  const slots = await findSlots(semester.id, filter);
  const changes = await changesForWeek(slots.map((s) => s.id), monday);

  return (
    <>
      <PageHeader title={t("schedule.title")}>
        <div className="flex flex-wrap gap-2 print:hidden">
          {extra}
          {exportHref && (
            <a href={exportHref}>
              <Button variant="outline">
                <FileSpreadsheet className="size-4" />
                {t("schedule.exportExcel")}
              </Button>
            </a>
          )}
          <PrintButton label={t("schedule.print")} />
        </div>
      </PageHeader>
      <div className="space-y-4">
        <WeekNav monday={monday} params={{}} />
        <WeekGrid slots={slots} monday={monday} changes={changes} mode={mode} hrefFor={hrefFor} />
      </div>
    </>
  );
}
