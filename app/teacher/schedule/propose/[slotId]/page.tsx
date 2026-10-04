import { forbidden, notFound } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { ChangeFields } from "@/components/change-fields";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { proposeChangeAction } from "@/lib/proposal-actions";
import { slotInclude } from "@/lib/schedule";

export default async function ProposePage({ params }: { params: Promise<{ slotId: string }> }) {
  const [{ slotId }, session] = await Promise.all([params, auth()]);
  const slot = await db.scheduleSlot.findFirst({ where: { id: slotId, deletedAt: null }, include: slotInclude });
  if (!slot) notFound();
  // Teachers may only propose changes for their own lessons.
  if (slot.teacherId !== session!.user.id) forbidden();
  return (
    <>
      <PageHeader title={`${t("proposals.propose")}: ${slot.course.name}`} />
      <p className="mb-4 text-sm text-muted">
        {slot.group.name} · {t(`days.${slot.dayOfWeek}`)}, {slot.period.number}-para ({slot.period.startTime})
        {slot.room && ` · ${t("schedule.room")}: ${slot.room.name}`}
      </p>
      <Card className="max-w-2xl p-6">
        <ActionForm action={proposeChangeAction.bind(null, slot.id)}>
          <ChangeFields dayOfWeek={slot.dayOfWeek} shift={slot.period.shift} />
          <Button type="submit">{t("proposals.send")}</Button>
        </ActionForm>
      </Card>
    </>
  );
}
