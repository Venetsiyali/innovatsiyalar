import { auth } from "@/auth";
import { DeadlineList, loadStudentAssignments } from "@/components/deadline-list";
import { PageHeader } from "@/components/field";
import { t } from "@/lib/i18n";

export default async function StudentAssignmentsPage() {
  const session = (await auth())!;
  const rows = await loadStudentAssignments(session.user.id);
  const now = new Date();
  // Open ones first (nearest deadline on top), then past ones (most recent first).
  const upcoming = rows.filter((a) => a.deadline >= now);
  const past = rows.filter((a) => a.deadline < now).reverse();
  return (
    <>
      <PageHeader title={t("assignments.title")} />
      {rows.length === 0 && <p className="text-muted">{t("assignments.none")}</p>}
      <div className="space-y-6">
        {upcoming.length > 0 && <DeadlineList rows={upcoming} />}
        {past.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-semibold text-muted">{t("assignments.overdue")}</h2>
            <DeadlineList rows={past} />
          </section>
        )}
      </div>
    </>
  );
}
