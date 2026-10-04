import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ChangeFields } from "@/components/change-fields";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n";
import { slotInclude } from "@/lib/schedule";
import { deleteChangeAction, deleteSlotAction, saveChangeAction, saveSlotAction } from "../../actions";
import { SlotFields } from "../../slot-fields";

export default async function SlotPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const live = { deletedAt: null };
  const slot = await db.scheduleSlot.findFirst({ where: { id, ...live }, include: slotInclude });
  if (!slot) notFound();

  const changes = await db.scheduleChange.findMany({ where: { slotId: id, ...live }, orderBy: { date: "desc" } });

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
              <ChangeFields dayOfWeek={slot.dayOfWeek} shift={slot.period.shift} />
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
