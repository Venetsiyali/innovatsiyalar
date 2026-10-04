import type { Shift } from "@prisma/client";
import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { addDays, dayOfWeek, isoDate, todayDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

/** Fields for cancelling/moving one lesson occurrence (admin change form and teacher proposal form). */
export async function ChangeFields({ dayOfWeek: slotDay, shift }: { dayOfWeek: number; shift: Shift }) {
  const [periods, rooms] = await Promise.all([
    db.lessonPeriod.findMany({ where: { deletedAt: null, shift }, orderBy: { number: "asc" } }),
    db.room.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  // Next occurrence of this weekday, as a sensible default date.
  const today = todayDate();
  const next = addDays(today, (slotDay - dayOfWeek(today) + 7) % 7);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t("schedule.changeDate")} (${t(`days.${slotDay}`)})`} htmlFor="date">
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
    </>
  );
}
