import type { Assignment } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { attachmentPrefix } from "@/lib/assignment-rules";
import { saveAssignmentAction } from "@/lib/assignment-actions";
import { addDays, toLocalInput } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { storageDriver } from "@/lib/storage";

export function uploadLabels(choose: string) {
  return {
    choose,
    uploading: t("content.uploading"),
    remove: t("assignments.removeAttachment"),
    badType: t("content.badType"),
    tooBig: t("content.tooBig"),
  };
}

const textareaClass =
  "w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export async function AssignmentForm({ courseId, assignment }: { courseId: string; assignment?: Assignment & { groupIds: string[] } }) {
  const live = { deletedAt: null };
  const [groups, modules] = await Promise.all([
    db.courseGroup.findMany({ where: { courseId, ...live, group: live }, include: { group: true }, orderBy: { group: { name: "asc" } } }),
    db.module.findMany({ where: { courseId, ...live }, orderBy: { position: "asc" } }),
  ]);
  const a = assignment;
  const now = new Date();

  return (
    <ActionForm action={saveAssignmentAction.bind(null, courseId, a?.id ?? null)}>
      <Field label={t("assignments.assignmentTitle")} htmlFor="title">
        <Input id="title" name="title" required defaultValue={a?.title} />
      </Field>
      <Field label={t("assignments.description")} htmlFor="description">
        <textarea id="description" name="description" rows={6} defaultValue={a?.description ?? ""} className={textareaClass} />
      </Field>
      <Field label={t("assignments.attachment")}>
        <UploadField
          name="attachmentUrl"
          driver={storageDriver()}
          prefix={attachmentPrefix(courseId)}
          payload={{ courseId, kind: "attachment" }}
          initialUrl={a?.attachmentUrl}
          initialLabel={a?.attachmentUrl ? a.title : undefined}
          labels={uploadLabels(t("assignments.attach"))}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t("assignments.maxScore")} htmlFor="maxScore">
          <Input id="maxScore" name="maxScore" type="number" min={1} max={100} required defaultValue={a?.maxScore ?? 10} />
        </Field>
        <Field label={t("assignments.category")} htmlFor="category">
          <Select id="category" name="category" defaultValue={a?.category ?? "CURRENT"}>
            {(["CURRENT", "MIDTERM", "FINAL"] as const).map((c) => (
              <option key={c} value={c}>{t(`assignments.${c}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("assignments.submissionType")} htmlFor="submissionType">
          <Select id="submissionType" name="submissionType" defaultValue={a?.submissionType ?? "FILE"}>
            {(["FILE", "TEXT", "BOTH"] as const).map((c) => (
              <option key={c} value={c}>{t(`assignments.${c}`)}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("assignments.startsAt")} htmlFor="startsAt">
          <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={toLocalInput(a?.startsAt ?? now)} />
        </Field>
        <Field label={t("assignments.deadline")} htmlFor="deadline">
          <Input id="deadline" name="deadline" type="datetime-local" required defaultValue={toLocalInput(a?.deadline ?? addDays(now, 7))} />
        </Field>
        <Field label={t("assignments.module")} htmlFor="moduleId">
          <Select id="moduleId" name="moduleId" defaultValue={a?.moduleId ?? ""}>
            <option value="">{t("assignments.noModule")}</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-3 sm:items-end">
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="allowLate" defaultChecked={a?.allowLate} className="size-4" />
          {t("assignments.allowLate")}
        </label>
        <Field label={t("assignments.lateDays")} htmlFor="lateDays">
          <Input id="lateDays" name="lateDays" type="number" min={0} max={60} defaultValue={a?.lateDays ?? 3} />
        </Field>
        <Field label={t("assignments.latePenalty")} htmlFor="latePenaltyPct">
          <Input id="latePenaltyPct" name="latePenaltyPct" type="number" min={0} max={100} defaultValue={a?.latePenaltyPct ?? 20} />
        </Field>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">{t("assignments.groups")}</legend>
        <div className="grid gap-1 sm:grid-cols-3">
          {groups.map(({ group }) => (
            <label key={group.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="groupIds"
                value={group.id}
                defaultChecked={a ? a.groupIds.includes(group.id) : true}
                className="size-4"
              />
              {group.name}
            </label>
          ))}
        </div>
      </fieldset>
      <Button type="submit">{a ? t("common.save") : t("common.create")}</Button>
    </ActionForm>
  );
}
