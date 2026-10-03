import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { addDays, dayOfWeek, formatDate, isoDate, todayDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { slotInclude } from "@/lib/schedule";
import { deleteChangeAction, deleteSlotAction, saveChangeAction, saveSlotAction } from "../../actions";
import { SlotFields } from "../../slot-fields";

export default async function SlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const live = { deletedAt: null };
  const slot = await db.scheduleSlot.findFirst({ where: { id, ...live }, include: slotInclude });
  if (!slot) notFound();

  const [changes, periods, rooms] = await Promise.all([
    db.scheduleChange.findMany({ where: { slotId: id, ...live }, orderBy: { date: "desc" } }),
    db.lessonPeriod.findMany({ where: { ...live, shift: slot.period.shift }, orderBy: { number: "asc" } }),
    db.room.findMany({ where: live, orderBy: { name: "asc" } }),
  ]);
  // Next occurrence of this weekday, as a sensible default date.
  const today = todayDate();
  const next = addDays(today, (slot.dayOfWeek - dayOfWeek(today) + 7) % 7);

  return (
    <>
      <PageHeader title={`${slot.course.name} — ${slot.group.name}`}>
        <Link href={`/admin/schedule?view=group&id=${slot.groupId}`}>
          <Button variant="outline">{t("common.back")}</Button>
        </Link>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <CardTitle>{t("schedule.editSlot")}</CardTitle>
          <ActionForm action={saveSlotAction.bind(null, slot.id)}>
            <SlotFields defaults={slot} />
            <Button type="submit">{t("common.save")}</Button>
          </ActionForm>
          <ActionForm action={deleteSlotAction.bind(null, slot.id)} confirm={t("common.confirmDelete")}>
            <Button type="submit" variant="outline" className="text-destructive">{t("common.delete")}</Button>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <CardTitle>{t("schedule.changeOne")}</CardTitle>
            <ActionForm action={saveChangeAction.bind(null, slot.id)} resetOnSuccess>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${t("schedule.changeDate")} (${t(`days.${slot.dayOfWeek}`)})`} htmlFor="date">
                  <Input id="date" name="date" type="date" required defaultValue={isoDate(next)} />
                </Field>
                <Field label={t("schedule.changeType")} htmlFor="type">
                  <Select id="type" name="type">
                    <option value="CANCELLED">{t("schedule.cancel")}</option>
                    <option value="MOVED">{t("schedule.move")}</option>
                  </Select>
                </Field>
              </div>
              <Field label={t("schedule.reason")} htmlFor="reason">
                <Input id="reason" name="reason" required />
              </Field>
              <fieldset className="grid gap-3 rounded-md border border-dashed border-border p-3 sm:grid-cols-3">
                <legend className="px-1 text-xs text-muted">{t("schedule.move")}</legend>
                <Field label={t("schedule.newDate")} htmlFor="newDate">
                  <Input id="newDate" name="newDate" type="date" />
                </Field>
                <Field label={t("schedule.newPeriod")} htmlFor="newPeriodId">
                  <Select id="newPeriodId" name="newPeriodId" defaultValue="">
                    <option value="">{t("schedule.sameAsBefore")}</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.number}-para ({p.startTime})</option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("schedule.newRoom")} htmlFor="newRoomId">
                  <Select id="newRoomId" name="newRoomId" defaultValue="">
                    <option value="">{t("schedule.sameAsBefore")}</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </Select>
                </Field>
              </fieldset>
              <Button type="submit">{t("common.save")}</Button>
            </ActionForm>
          </Card>

          <Card className="space-y-3 p-6">
            <CardTitle>{t("schedule.history")}</CardTitle>
            {changes.length === 0 && <p className="text-sm text-muted">{t("common.none")}</p>}
            <ul className="space-y-2">
              {changes.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p>
                      <span className="font-medium">{formatDate(c.date)}</span>{" "}
                      <Badge tone={c.type === "CANCELLED" ? "red" : "default"}>
                        {t(c.type === "CANCELLED" ? "schedule.cancelled" : "schedule.moved")}
                      </Badge>
                      {c.newDate && ` → ${formatDate(c.newDate)}`}
                    </p>
                    <p className="text-muted">{c.reason}</p>
                  </div>
                  <ActionForm action={deleteChangeAction.bind(null, c.id)}>
                    <Button type="submit" variant="ghost" size="sm">{t("schedule.undo")}</Button>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
