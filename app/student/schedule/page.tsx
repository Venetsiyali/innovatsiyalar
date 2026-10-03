import { auth } from "@/auth";
import { MySchedule } from "@/components/my-schedule";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function StudentSchedulePage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const [{ week }, session] = await Promise.all([searchParams, auth()]);
  const enrollments = await db.enrollment.findMany({
    where: { userId: session!.user.id, deletedAt: null, status: "ACTIVE", group: { deletedAt: null } },
    select: { groupId: true },
  });
  if (!enrollments.length) return <p className="text-muted">{t("schedule.noGroup")}</p>;
  const groupIds = enrollments.map((e) => e.groupId);
  return (
    <MySchedule
      filter={{ groupIds }}
      mode="group"
      week={week}
      exportHref={groupIds.length === 1 ? `/api/schedule/export?view=group&id=${groupIds[0]}` : undefined}
    />
  );
}
