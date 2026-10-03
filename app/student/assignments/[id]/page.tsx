import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { uploadLabels } from "@/components/assignment-form";
import { StatusBadge } from "@/components/deadline-list";
import { Field, PageHeader } from "@/components/field";
import { UploadField } from "@/components/upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { submitAssignmentAction } from "@/lib/assignment-actions";
import { effectiveScore, submissionPrefix, submissionWindow } from "@/lib/assignment-rules";
import { studentAssignmentsWhere } from "@/lib/assignments";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { storageDriver } from "@/lib/storage";

export default async function StudentAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const userId = session!.user.id;
  const a = await db.assignment.findFirst({
    where: { id, ...studentAssignmentsWhere(userId) },
    include: {
      course: { select: { name: true } },
      submissions: { where: { studentId: userId, deletedAt: null }, include: { grade: true } },
    },
  });
  // Not assigned to this student's groups (or not started yet) → behave as if it doesn't exist.
  if (!a) notFound();

  const sub = a.submissions[0];
  const window = submissionWindow(a);
  const canSubmit = window.state === "open" && !sub?.grade;
  const wantsFile = a.submissionType !== "TEXT";
  const wantsText = a.submissionType !== "FILE";

  return (
    <>
      <PageHeader title={a.title}>
        <StatusBadge a={a} />
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted">
            {a.course.name} · {t("assignments.due", { date: formatDateTime(a.deadline) })} · {t("assignments.maxShort", { max: a.maxScore })}
          </p>
          {a.description && <div className="whitespace-pre-wrap text-sm">{a.description}</div>}
          {a.attachmentUrl && (
            <a href={`/api/assignments/${a.id}/file?download=1`}>
              <Button variant="outline" size="sm">{t("assignments.attachment")}: {t("content.download")}</Button>
            </a>
          )}
        </Card>

        <div className="space-y-4">
          {sub?.grade && (
            <Card className="space-y-1 border-emerald-200 p-5">
              <CardTitle>
                {t("assignments.effective")}: {effectiveScore(sub.grade.score, sub.isLate, a.latePenaltyPct)} / {a.maxScore}
              </CardTitle>
              {sub.grade.comment && (
                <p className="whitespace-pre-wrap text-sm">
                  <span className="text-muted">{t("assignments.teacherComment")}:</span> {sub.grade.comment}
                </p>
              )}
            </Card>
          )}

          {sub && (
            <Card className="space-y-2 p-5 text-sm">
              <CardTitle className="text-base">{t("assignments.yourAnswer")}</CardTitle>
              <p className="text-muted">
                {t("assignments.submittedAt")}: {formatDateTime(sub.submittedAt)} {sub.isLate && `(${t("assignments.lateBy")})`}
              </p>
              {sub.text && <p className="whitespace-pre-wrap">{sub.text}</p>}
              {sub.fileUrl && (
                <a className="text-primary hover:underline" href={`/api/submissions/${sub.id}/file?download=1`}>
                  {t("assignments.file")}: {t("content.download")}
                </a>
              )}
            </Card>
          )}

          <Card className="p-5">
            {window.state === "notStarted" && <p className="text-sm text-muted">{t("assignments.notStarted")}</p>}
            {window.state === "closed" && !sub?.grade && <p className="text-sm text-destructive">{t("assignments.closed")}</p>}
            {sub?.grade && <p className="text-sm text-muted">{t("assignments.gradedFinal")}</p>}
            {canSubmit && (
              <ActionForm action={submitAssignmentAction.bind(null, a.id)}>
                {window.late && (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {t("assignments.lateWarning", { date: formatDateTime(window.closesAt), pct: a.latePenaltyPct })}
                  </p>
                )}
                {wantsFile && (
                  <Field label={t("assignments.file")}>
                    <UploadField
                      name="fileUrl"
                      driver={storageDriver()}
                      prefix={submissionPrefix(a.courseId, a.id, userId)}
                      payload={{ courseId: a.courseId, assignmentId: a.id, kind: "submission" }}
                      initialUrl={sub?.fileUrl}
                      initialLabel={sub?.fileUrl ? t("assignments.yourAnswer") : undefined}
                      labels={uploadLabels(t("content.addFiles"))}
                    />
                  </Field>
                )}
                {wantsText && (
                  <Field label={t("assignments.text")} htmlFor="text">
                    <textarea
                      id="text"
                      name="text"
                      rows={6}
                      defaultValue={sub?.text ?? ""}
                      className="w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    />
                  </Field>
                )}
                <Button type="submit" className="w-full">{sub ? t("assignments.resubmit") : t("assignments.submit")}</Button>
              </ActionForm>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
