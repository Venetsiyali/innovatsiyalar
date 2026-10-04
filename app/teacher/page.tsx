import Link from "next/link";
import { auth } from "@/auth";
import { TodayLessons } from "@/components/today-lessons";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function TeacherDashboard() {
  const session = (await auth())!;
  const live = { deletedAt: null };
  const toGrade = await db.submission.count({
    where: { ...live, grade: null, assignment: { ...live, course: { teachers: { some: { userId: session.user.id, ...live } } } } },
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.welcome", { name: session.user.name ?? "" })}</h1>
      <TodayLessons filter={{ teacherId: session.user.id }} attendanceLinks />
      {toGrade > 0 && (
        <Link href="/teacher/assignments" className="block rounded-xl border border-primary/30 bg-accent p-4 font-medium text-primary">
          {t("dashboard.toGrade", { count: toGrade })} →
        </Link>
      )}
    </div>
  );
}
