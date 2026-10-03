import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { Field, PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { gradeAction } from "@/lib/assignment-actions";
import { effectiveScore } from "@/lib/assignment-rules";
import { assignmentStudents } from "@/lib/assignments";
import { canManageCourse } from "@/lib/course-access";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { extOf, isPreviewable, MIME_BY_EXT } from "@/lib/files";
import { t } from "@/lib/i18n";
import { keyOf } from "@/lib/storage";

/** SpeedGrader-style window: work on the left, score + comment on the right, "next" below. */
export default async function GradePage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const [{ id, studentId }, session] = await Promise.all([params, auth()]);
  const live = { deletedAt: null };
  const a = await db.assignment.findFirst({ where: { id, ...live } });
  if (!a) notFound();
  if (!(await canManageCourse(session!.user, a.courseId))) forbidden();

  const [students, submissions] = await Promise.all([
    assignmentStudents(a.id),
    db.submission.findMany({ where: { assignmentId: a.id, ...live }, include: { grade: true } }),
  ]);
  // Navigate only between students who submitted.
  const submittedIds = new Set(submissions.map((s) => s.studentId));
  const queue = students.filter((s) => submittedIds.has(s.id));
  const idx = queue.findIndex((s) => s.id === studentId);
  const student = queue[idx];
  const sub = submissions.find((s) => s.studentId === studentId);
  if (!student || !sub) notFound();

  const href = (sid: string) => `/teacher/assignments/${a.id}/grade/${sid}`;
  const next = queue[idx + 1];
  const prev = queue[idx - 1];
  const mime = sub.fileUrl ? MIME_BY_EXT[extOf(keyOf(sub.fileUrl))] : undefined;
  const fileHref = `/api/submissions/${sub.id}/file`;

  return (
    <>
      <PageHeader title={`${a.title} — ${student.fullName}`}>
        <span className="text-sm text-muted">
          {idx + 1} / {queue.length}
        </span>
        {prev && (
          <Link href={href(prev.id)}>
            <Button variant="outline">← {t("assignments.prevStudent")}</Button>
          </Link>
        )}
        {next && (
          <Link href={href(next.id)}>
            <Button variant="outline">{t("assignments.nextStudent")} →</Button>
          </Link>
        )}
        <Link href={`/teacher/assignments/${a.id}`}>
          <Button variant="ghost">{t("common.back")}</Button>
        </Link>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="min-h-[60vh] space-y-3 overflow-hidden p-4">
          <p className="text-sm text-muted">
            {t("assignments.submittedAt")}: {formatDateTime(sub.submittedAt)}{" "}
            {sub.isLate && <Badge tone="red">{t("assignments.late")}</Badge>}
          </p>
          {sub.text && <div className="whitespace-pre-wrap rounded-md bg-accent/40 p-3 text-sm">{sub.text}</div>}
          {sub.fileUrl &&
            (isPreviewable(mime) ? (
              mime?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element -- private file behind an auth-checked route
                <img src={fileHref} alt="" className="max-w-full rounded-md border border-border" />
              ) : (
                <iframe src={fileHref} title={student.fullName} className="h-[70vh] w-full rounded-md border border-border" />
              )
            ) : (
              <p className="text-sm text-muted">{t("assignments.noPreview")}</p>
            ))}
          {sub.fileUrl && (
            <a href={`${fileHref}?download=1`}>
              <Button variant="outline" size="sm">{t("content.download")}</Button>
            </a>
          )}
        </Card>

        <Card className="h-fit p-4">
          <ActionForm key={sub.id} action={gradeAction.bind(null, sub.id, next ? href(next.id) : null)}>
            <Field label={`${t("assignments.score")} (0–${a.maxScore})`} htmlFor="score">
              <Input id="score" name="score" type="number" step="0.5" min={0} max={a.maxScore} required defaultValue={sub.grade?.score} autoFocus />
            </Field>
            {sub.isLate && a.latePenaltyPct > 0 && (
              <p className="text-xs text-destructive">
                {t("assignments.penaltyHint", {
                  pct: a.latePenaltyPct,
                  score: sub.grade ? effectiveScore(sub.grade.score, true, a.latePenaltyPct) : "—",
                })}
              </p>
            )}
            <Field label={t("assignments.comment")} htmlFor="comment">
              <textarea
                id="comment"
                name="comment"
                rows={6}
                defaultValue={sub.grade?.comment ?? ""}
                className="w-full rounded-md border border-border bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" name="goNext" value="0" variant="outline">{t("assignments.save")}</Button>
              {next && (
                <Button type="submit" name="goNext" value="1">{t("assignments.saveNext")} →</Button>
              )}
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
