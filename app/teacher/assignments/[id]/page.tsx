import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { AssignmentForm } from "@/components/assignment-form";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { deleteAssignmentAction } from "@/lib/assignment-actions";
import { effectiveScore } from "@/lib/assignment-rules";
import { assignmentStudents } from "@/lib/assignments";
import { canManageCourse } from "@/lib/course-access";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function TeacherAssignmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }, session] = await Promise.all([params, searchParams, auth()]);
  const live = { deletedAt: null };
  const a = await db.assignment.findFirst({
    where: { id, ...live },
    include: { course: true, groups: { where: live, select: { groupId: true } }, submissions: { where: live, include: { grade: true } } },
  });
  if (!a) notFound();
  if (!(await canManageCourse(session!.user, a.courseId))) forbidden();

  const students = await assignmentStudents(a.id);
  const byStudent = new Map(a.submissions.map((s) => [s.studentId, s]));

  return (
    <>
      <PageHeader title={a.title}>
        <Link href={`/teacher/my-courses/${a.courseId}`}>
          <Button variant="outline">{a.course.name}</Button>
        </Link>
      </PageHeader>
      {created && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{t("assignments.created", { count: created })}</p>
      )}
      <p className="mb-4 text-sm text-muted">
        {t("assignments.due", { date: formatDateTime(a.deadline) })} · {t("assignments.maxShort", { max: a.maxScore })} ·{" "}
        {t(`assignments.${a.category}`)}
      </p>

      <Table>
        <thead>
          <tr>
            <Th>{t("assignments.student")}</Th>
            <Th>{t("assignments.status")}</Th>
            <Th>{t("assignments.submittedAt")}</Th>
            <Th>{t("assignments.score")}</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {students.map((st) => {
            const sub = byStudent.get(st.id);
            return (
              <tr key={st.id} className={sub?.isLate ? "bg-red-50/60" : undefined}>
                <Td>
                  <p className="font-medium">{st.fullName}</p>
                  <p className="text-xs text-muted">{st.enrollments.map((e) => e.group.name).join(", ")}</p>
                </Td>
                <Td>
                  {!sub ? (
                    <Badge tone="gray">{t("assignments.notSubmitted")}</Badge>
                  ) : sub.grade ? (
                    <Badge tone="green">{t("assignments.graded")}</Badge>
                  ) : (
                    <Badge>{t("assignments.submitted")}</Badge>
                  )}{" "}
                  {sub?.isLate && <Badge tone="red">{t("assignments.late")}</Badge>}
                </Td>
                <Td className={sub?.isLate ? "font-medium text-destructive" : ""}>{sub ? formatDateTime(sub.submittedAt) : "—"}</Td>
                <Td>{sub?.grade ? `${effectiveScore(sub.grade.score, sub.isLate, a.latePenaltyPct)} / ${a.maxScore}` : "—"}</Td>
                <Td className="text-right">
                  {sub && (
                    <Link href={`/teacher/assignments/${a.id}/grade/${st.id}`}>
                      <Button size="sm" variant="outline">{t("assignments.openGrading")}</Button>
                    </Link>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <details className="mt-6">
        <summary className="cursor-pointer font-medium">{t("assignments.edit")}</summary>
        <Card className="mt-3 max-w-3xl space-y-4 p-6">
          <AssignmentForm courseId={a.courseId} assignment={{ ...a, groupIds: a.groups.map((g) => g.groupId) }} />
          <ActionForm action={deleteAssignmentAction.bind(null, a.id)} confirm={t("common.confirmDelete")}>
            <Button type="submit" variant="outline" className="text-destructive">{t("common.delete")}</Button>
          </ActionForm>
        </Card>
      </details>
    </>
  );
}
