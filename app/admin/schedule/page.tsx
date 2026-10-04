import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { PrintButton } from "@/components/print-button";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { WeekGrid, WeekNav } from "@/components/week-grid";
import { db } from "@/lib/db";
import { mondayOf, parseDate, todayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { activeSemester, changesForWeek, findSlots } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { saveSlotAction } from "./actions";
import { SlotFields } from "./slot-fields";

type View = "group" | "teacher" | "room";
const VIEWS: View[] = ["group", "teacher", "room"];
const VIEW_LABEL = { group: "schedule.byGroup", teacher: "schedule.byTeacher", room: "schedule.byRoom" } as const;

export default async function AdminSchedulePage({ searchParams }: { searchParams: Promise<{ view?: string; id?: string; week?: string }> }) {
  const sp = await searchParams;
  const view: View = VIEWS.includes(sp.view as View) ? (sp.view as View) : "group";
  const semester = await activeSemester();
  if (!semester) return <p className="text-muted">{t("schedule.noActiveSemester")}</p>;

  const live = { deletedAt: null };
  const options =
    view === "group"
      ? (await db.group.findMany({ where: live, orderBy: [{ shift: "asc" }, { name: "asc" }] })).map((g) => ({ id: g.id, label: g.name }))
      : view === "teacher"
        ? (await db.user.findMany({ where: { ...live, role: "TEACHER" }, orderBy: { fullName: "asc" } })).map((u) => ({ id: u.id, label: u.fullName }))
        : (await db.room.findMany({ where: live, orderBy: { name: "asc" } })).map((r) => ({ id: r.id, label: r.name }));
  const id = options.some((o) => o.id === sp.id) ? sp.id! : undefined;

  const monday = mondayOf(parseDate(sp.week) ?? todayDate());
  const slots = id
    ? await findSlots(semester.id, view === "group" ? { groupIds: [id] } : view === "teacher" ? { teacherId: id } : { roomId: id })
    : [];
  const changes = await changesForWeek(slots.map((s) => s.id), monday);
  const title = options.find((o) => o.id === id)?.label;
  const pendingProposals = await db.scheduleProposal.count({ where: { status: "PENDING", deletedAt: null } });

  return (
    <>
      <PageHeader title={title ? `${t("schedule.title")}: ${title}` : t("schedule.title")}>
        <Link href="/admin/schedule/proposals" className="print:hidden">
          <Button variant={pendingProposals ? "default" : "outline"}>{t("proposals.pendingCount", { count: pendingProposals })}</Button>
        </Link>
        <Link href="/admin/schedule/import" className="print:hidden">
          <Button variant="outline">
            <Upload className="size-4" />
            {t("schedule.import")}
          </Button>
        </Link>
      </PageHeader>

      <div className="mb-4 space-y-3 print:hidden">
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <Link
              key={v}
              href={`?view=${v}`}
              className={cn("rounded-md px-3 py-1.5 text-sm", v === view ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}
            >
              {t(VIEW_LABEL[v])}
            </Link>
          ))}
        </div>
        <form className="flex flex-wrap gap-2">
          <input type="hidden" name="view" value={view} />
          {sp.week && <input type="hidden" name="week" value={sp.week} />}
          <Select name="id" defaultValue={id ?? ""} className="w-72">
            <option value="" disabled>{t("schedule.choose")}</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">{t("schedule.show")}</Button>
        </form>
      </div>

      {id && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <WeekNav monday={monday} params={{ view, id }} />
            <div className="flex gap-2 print:hidden">
              <a href={`/api/schedule/export?view=${view}&id=${id}`}>
                <Button variant="outline">
                  <FileSpreadsheet className="size-4" />
                  {t("schedule.exportExcel")}
                </Button>
              </a>
              <PrintButton label={t("schedule.print")} />
            </div>
          </div>
          <WeekGrid slots={slots} monday={monday} changes={changes} mode={view} hrefFor={(s) => `/admin/schedule/slot/${s.id}`} />
          {view === "group" && (
            <Card className="space-y-3 p-6 print:hidden">
              <CardTitle>{t("schedule.addSlot")}</CardTitle>
              <ActionForm action={saveSlotAction.bind(null, null)}>
                <SlotFields fixedGroupId={id} />
                <Button type="submit">{t("common.add")}</Button>
              </ActionForm>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
