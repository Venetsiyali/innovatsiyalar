import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { LESSON_TYPES } from "@/lib/schedule";

type Defaults = {
  groupId?: string;
  courseId?: string;
  teacherId?: string | null;
  roomId?: string | null;
  periodId?: string;
  dayOfWeek?: number;
  lessonType?: string | null;
  alternating?: boolean;
};

export async function SlotFields({ defaults = {}, fixedGroupId }: { defaults?: Defaults; fixedGroupId?: string }) {
  const live = { deletedAt: null };
  const groupId = fixedGroupId ?? defaults.groupId;
  const [groups, courses, teachers, rooms, periods, group] = await Promise.all([
    fixedGroupId ? [] : db.group.findMany({ where: live, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.course.findMany({
      where: live,
      orderBy: { name: "asc" },
      select: { id: true, name: true, groups: { where: { ...live, groupId }, select: { id: true } } },
    }),
    db.user.findMany({ where: { ...live, role: "TEACHER" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    db.room.findMany({ where: live, orderBy: { name: "asc" } }),
    db.lessonPeriod.findMany({ where: live, orderBy: [{ shift: "asc" }, { number: "asc" }] }),
    groupId ? db.group.findUnique({ where: { id: groupId }, select: { shift: true } }) : null,
  ]);
  // The group's own courses first, then everything else.
  const own = courses.filter((c) => c.groups.length);
  const rest = courses.filter((c) => !c.groups.length);
  const shiftPeriods = group ? periods.filter((p) => p.shift === group.shift) : periods;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fixedGroupId ? (
        <input type="hidden" name="groupId" value={fixedGroupId} />
      ) : (
        <Field label={t("schedule.group")} htmlFor="groupId">
          <Select id="groupId" name="groupId" required defaultValue={defaults.groupId}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={t("schedule.day")} htmlFor="dayOfWeek">
        <Select id="dayOfWeek" name="dayOfWeek" defaultValue={defaults.dayOfWeek ?? 1}>
          {[1, 2, 3, 4, 5, 6].map((d) => (
            <option key={d} value={d}>{t(`days.${d}`)}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("schedule.period")} htmlFor="periodId">
        <Select id="periodId" name="periodId" required defaultValue={defaults.periodId}>
          {shiftPeriods.map((p) => (
            <option key={p.id} value={p.id}>
              {t(`shift.${p.shift}`)} · {p.number}-para ({p.startTime}–{p.endTime})
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("schedule.course")} htmlFor="courseId">
        <Select id="courseId" name="courseId" required defaultValue={defaults.courseId ?? ""}>
          <option value="" disabled>{t("schedule.choose")}</option>
          {own.length > 0 && (
            <optgroup label={t("groups.courses")}>
              {own.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          )}
          <optgroup label={t("common.all")}>
            {rest.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        </Select>
      </Field>
      <Field label={t("schedule.teacher")} htmlFor="teacherId">
        <Select id="teacherId" name="teacherId" defaultValue={defaults.teacherId ?? ""}>
          <option value="">{t("common.none")}</option>
          {teachers.map((u) => (
            <option key={u.id} value={u.id}>{u.fullName}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("schedule.room")} htmlFor="roomId">
        <div className="flex gap-2">
          <Select id="roomId" name="roomId" defaultValue={defaults.roomId ?? ""}>
            <option value="">{t("common.none")}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          <Input name="newRoom" placeholder="+ yangi" className="w-28" aria-label={t("schedule.newRoom")} />
        </div>
      </Field>
      <Field label={t("schedule.lessonType")} htmlFor="lessonType">
        <Select id="lessonType" name="lessonType" defaultValue={defaults.lessonType ?? ""}>
          <option value="">{t("common.none")}</option>
          {LESSON_TYPES.map((lt) => (
            <option key={lt} value={lt}>{t(`schedule.${lt}`)}</option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm">
        <input type="checkbox" name="alternating" defaultChecked={defaults.alternating} className="size-4" />
        {t("schedule.alternating")}
      </label>
    </div>
  );
}
