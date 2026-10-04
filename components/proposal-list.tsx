import type { Prisma } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { approveProposalAction, rejectProposalAction } from "@/lib/proposal-actions";

const TONE = { PENDING: "gray", APPROVED: "green", REJECTED: "red" } as const;

/** Proposal cards; admins get approve/reject controls on pending ones. */
export async function ProposalList({ where, review }: { where: Prisma.ScheduleProposalWhereInput; review?: boolean }) {
  const items = await db.scheduleProposal.findMany({
    where: { ...where, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      teacher: { select: { fullName: true } },
      slot: { include: { course: { select: { name: true } }, group: { select: { name: true } }, period: true } },
    },
  });
  if (!items.length) return <p className="text-sm text-muted">{t("proposals.none")}</p>;
  const periodIds = items.map((p) => p.newPeriodId).filter(Boolean) as string[];
  const roomIds = items.map((p) => p.newRoomId).filter(Boolean) as string[];
  const [periods, rooms] = await Promise.all([
    db.lessonPeriod.findMany({ where: { id: { in: periodIds } } }),
    db.room.findMany({ where: { id: { in: roomIds } } }),
  ]);

  return (
    <ul className="space-y-3">
      {items.map((p) => {
        const np = periods.find((x) => x.id === p.newPeriodId);
        const nr = rooms.find((x) => x.id === p.newRoomId);
        const target = [p.newDate && `→ ${formatDate(p.newDate)}`, np && `${np.number}-para (${np.startTime})`, nr && `${t("schedule.room")}: ${nr.name}`]
          .filter(Boolean)
          .join(", ");
        return (
          <li key={p.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {p.slot.course.name} — {p.slot.group.name}
                </p>
                <p className="text-sm text-muted">
                  {review && `${p.teacher.fullName} · `}
                  {formatDate(p.date)}, {p.slot.period.number}-para ·{" "}
                  {t(p.type === "CANCELLED" ? "schedule.cancel" : "schedule.move")} {target}
                </p>
              </div>
              <Badge tone={TONE[p.status]}>{t(`proposals.${p.status}`)}</Badge>
            </div>
            <p className="text-sm">
              <span className="text-muted">{t("schedule.reason")}:</span> {p.reason}
            </p>
            {p.reviewComment && <p className="text-sm italic text-muted">{p.reviewComment}</p>}
            {review && p.status === "PENDING" && (
              <div className="flex flex-wrap gap-2">
                <ActionForm action={approveProposalAction.bind(null, p.id)} className="flex flex-wrap items-start gap-2 space-y-0">
                  <Input name="comment" placeholder={t("proposals.comment")} className="w-56" />
                  <Button type="submit">{t("proposals.approve")}</Button>
                </ActionForm>
                <ActionForm action={rejectProposalAction.bind(null, p.id)} className="flex flex-wrap items-start gap-2 space-y-0">
                  <Input name="comment" placeholder={t("proposals.comment")} className="w-56" />
                  <Button type="submit" variant="outline" className="text-destructive">{t("proposals.reject")}</Button>
                </ActionForm>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
