"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatDate } from "@/lib/dates";
import { db } from "@/lib/db";
import { optStr, type FormState } from "@/lib/form";
import { t } from "@/lib/i18n";
import { notifyUsers } from "@/lib/notify";
import { assertRole } from "@/lib/permissions";
import { applyChange, readChangeForm, validateChange } from "@/lib/schedule-changes";

const live = { deletedAt: null };

/** TZ 3: a teacher proposes a change for their own lesson; an admin decides. */
export async function proposeChangeAction(slotId: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await auth();
  const user = session?.user;
  if (user?.role !== "TEACHER") return { error: t("errors.forbidden") };
  const slot = await db.scheduleSlot.findFirst({ where: { id: slotId, ...live }, include: { course: true, group: true } });
  if (!slot || slot.teacherId !== user.id) return { error: t("proposals.notYours") };

  const input = readChangeForm(fd);
  const error = await validateChange(slotId, input);
  if (error) return { error };
  if (await db.scheduleProposal.count({ where: { slotId, date: input.date!, status: "PENDING", ...live } })) {
    return { error: t("proposals.duplicate") };
  }
  await db.scheduleProposal.create({ data: { ...input, date: input.date!, slotId, teacherId: user.id } });

  const admins = await db.user.findMany({ where: { role: "ADMIN", isActive: true, ...live }, select: { id: true } });
  await notifyUsers(
    admins.map((a) => ({
      userId: a.id,
      type: "schedule_proposal",
      link: "/admin/schedule/proposals",
      message: t("proposals.newNotice", {
        teacher: user.name ?? "",
        course: slot.course.name,
        group: slot.group.name,
        date: formatDate(input.date!),
        type: t(input.type === "CANCELLED" ? "schedule.cancel" : "schedule.move").toLowerCase(),
      }),
    })),
  );
  revalidatePath("/teacher/schedule", "layout");
  redirect("/teacher/schedule/proposals?sent=1");
}

async function pendingProposal(id: string) {
  return db.scheduleProposal.findFirst({ where: { id, status: "PENDING", ...live }, include: { slot: { include: { course: true } } } });
}

export async function approveProposalAction(id: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const p = await pendingProposal(id);
  if (!p) return { error: t("proposals.alreadyReviewed") };
  // Re-validated at approval time: the timetable may have changed since it was proposed.
  const result = await applyChange(p.slotId, { date: p.date, type: p.type, reason: p.reason, newDate: p.newDate, newPeriodId: p.newPeriodId, newRoomId: p.newRoomId }, session.user.id);
  if ("error" in result) return { error: result.error };
  await db.scheduleProposal.update({
    where: { id },
    data: { status: "APPROVED", reviewedById: session.user.id, reviewedAt: new Date(), reviewComment: optStr(fd, "comment") },
  });
  await notifyUsers([
    { userId: p.teacherId, type: "schedule_change", link: "/teacher/schedule/proposals", message: t("proposals.approvedNotice", { course: p.slot.course.name, date: formatDate(p.date) }) },
  ]);
  revalidatePath("/admin/schedule", "layout");
  // The card leaves the "pending" list, so report on the page instead of inside its form.
  redirect(`/admin/schedule/proposals?approved=${result.count}`);
}

export async function rejectProposalAction(id: string, _p: FormState, fd: FormData): Promise<FormState> {
  const session = await assertRole("ADMIN");
  const p = await pendingProposal(id);
  if (!p) return { error: t("proposals.alreadyReviewed") };
  const comment = optStr(fd, "comment");
  await db.scheduleProposal.update({
    where: { id },
    data: { status: "REJECTED", reviewedById: session.user.id, reviewedAt: new Date(), reviewComment: comment },
  });
  await notifyUsers([
    {
      userId: p.teacherId,
      type: "schedule_proposal",
      link: "/teacher/schedule/proposals",
      message: t("proposals.rejectedNotice", { course: p.slot.course.name, date: formatDate(p.date), comment: comment ?? "" }),
    },
  ]);
  revalidatePath("/admin/schedule", "layout");
  redirect("/admin/schedule/proposals?rejected=1");
}
