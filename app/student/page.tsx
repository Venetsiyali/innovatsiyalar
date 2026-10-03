import Link from "next/link";
import { auth } from "@/auth";
import { DeadlineList, loadStudentAssignments } from "@/components/deadline-list";
import { t } from "@/lib/i18n";

export default async function StudentDashboard() {
  const session = (await auth())!;
  const now = new Date();
  const upcoming = (await loadStudentAssignments(session.user.id)).filter((a) => a.deadline >= now && !a.submissions[0]?.grade).slice(0, 8);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.welcome", { name: session.user.name ?? "" })}</h1>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("assignments.upcoming")}</h2>
          <Link href="/student/assignments" className="text-sm text-primary hover:underline">{t("common.all")}</Link>
        </div>
        {upcoming.length ? <DeadlineList rows={upcoming} /> : <p className="text-muted">{t("assignments.noUpcoming")}</p>}
      </section>
    </div>
  );
}
