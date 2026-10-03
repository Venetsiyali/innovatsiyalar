import Link from "next/link";
import { forbidden } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { auth } from "@/auth";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { canManageCourse } from "@/lib/course-access";
import { db } from "@/lib/db";
import { saveGradebookAction } from "@/lib/gradebook-actions";
import { CATEGORIES, computeGradebook } from "@/lib/gradebook";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const CATEGORY_BG = { CURRENT: "", MIDTERM: "bg-amber-50/60", FINAL: "bg-emerald-50/60" } as const;

/** Editable gradebook: rows = students, columns = assignments (TZ 4.6). */
export async function GradebookTable({ courseId, groupId }: { courseId: string; groupId?: string }) {
  const session = (await auth())!;
  if (!(await canManageCourse(session.user, courseId))) forbidden();

  const groups = await db.courseGroup.findMany({
    where: { courseId, deletedAt: null, group: { deletedAt: null } },
    include: { group: true },
    orderBy: { group: { name: "asc" } },
  });
  const validGroup = groups.some((g) => g.groupId === groupId) ? groupId : undefined;
  const { course, assignments, rows, weights } = await computeGradebook(courseId, { groupId: validGroup });
  const exportHref = `/api/gradebook/${courseId}/export${validGroup ? `?group=${validGroup}` : ""}`;

  return (
    <>
      <PageHeader title={`${t("gradebook.title")}: ${course.name}`}>
        <a href={exportHref}>
          <Button variant="outline">
            <FileSpreadsheet className="size-4" />
            {t("gradebook.export")}
          </Button>
        </a>
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <form className="flex gap-2">
          <Select name="group" defaultValue={validGroup ?? ""} className="w-64">
            <option value="">{t("gradebook.allGroups")}</option>
            {groups.map((g) => (
              <option key={g.groupId} value={g.groupId}>{g.group.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="outline">{t("common.filter")}</Button>
        </form>
        <p className="text-sm text-muted">{t("gradebook.weights", { c: weights.CURRENT, m: weights.MIDTERM, f: weights.FINAL })}</p>
      </div>
      <p className="mb-3 text-xs text-muted">{t("gradebook.hint")}</p>

      {rows.length === 0 ? (
        <p className="text-muted">{t("gradebook.noStudents")}</p>
      ) : (
        <ActionForm action={saveGradebookAction.bind(null, courseId)}>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="text-sm">
              <thead>
                <tr className="align-bottom">
                  <th className="sticky left-0 z-10 min-w-48 border-b border-border bg-card p-2 text-left font-medium">{t("gradebook.student")}</th>
                  {assignments.map((a) => (
                    <th key={a.id} className={cn("min-w-24 border-b border-l border-border p-2 text-left text-xs font-medium", CATEGORY_BG[a.category])}>
                      <p className="line-clamp-2">{a.title}</p>
                      <p className="font-normal text-muted">
                        {t(`assignments.${a.category}`)} · {a.maxScore}
                      </p>
                    </th>
                  ))}
                  {CATEGORIES.map((c) => (
                    <th key={c} className="border-b border-l border-border p-2 text-xs font-medium">{t(`assignments.${c}`)} %</th>
                  ))}
                  <th className="border-b border-l border-border p-2 text-xs font-semibold">{t("gradebook.total")}</th>
                  <th className="border-b border-l border-border p-2 text-xs font-medium">{t("gradebook.attendance")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/30">
                    <td className="sticky left-0 z-10 border-b border-border bg-card p-2">
                      <p className="font-medium">{r.fullName}</p>
                      <p className="text-xs text-muted">{r.group}</p>
                    </td>
                    {assignments.map((a) => {
                      const cell = r.cells[a.id];
                      if (cell === undefined) return <td key={a.id} className="border-b border-l border-border bg-slate-50" />;
                      return (
                        <td key={a.id} className={cn("border-b border-l border-border p-1", CATEGORY_BG[a.category])}>
                          <input
                            name={`g:${a.id}:${r.id}`}
                            type="number"
                            step="0.5"
                            min={0}
                            max={a.maxScore}
                            defaultValue={cell?.raw}
                            aria-label={`${r.fullName} — ${a.title}`}
                            className={cn(
                              "w-16 rounded border border-border bg-card px-1.5 py-1 text-right",
                              cell?.late && "border-destructive text-destructive",
                            )}
                            title={cell?.late ? `${t("gradebook.late")}: ${cell.effective}` : undefined}
                          />
                        </td>
                      );
                    })}
                    {CATEGORIES.map((c) => (
                      <td key={c} className="border-b border-l border-border p-2 text-right text-xs">{r.categoryPct[c] ?? "—"}</td>
                    ))}
                    <td className="border-b border-l border-border p-2 text-right font-semibold">{r.total ?? "—"}</td>
                    <td className={cn("border-b border-l border-border p-2 text-right text-xs", r.absences > 3 && "font-semibold text-destructive")}>
                      {r.attendancePct != null ? `${r.attendancePct}%` : "—"}
                      {r.absences > 0 && ` (${r.absences})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="submit">{t("gradebook.save")}</Button>
        </ActionForm>
      )}
    </>
  );
}

/** Course chooser for teachers (own courses) and admins (all). */
export async function GradebookCourseList({ basePath }: { basePath: string }) {
  const session = (await auth())!;
  const live = { deletedAt: null };
  const courses = await db.course.findMany({
    where: {
      ...live,
      semester: { isActive: true },
      ...(session.user.role === "TEACHER" && { teachers: { some: { userId: session.user.id, ...live } } }),
    },
    orderBy: { name: "asc" },
    include: { groups: { where: live, include: { group: { select: { name: true } } } } },
  });
  return (
    <>
      <PageHeader title={t("gradebook.title")} />
      <p className="mb-3 text-sm text-muted">{t("gradebook.choose")}</p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {courses.map((c) => (
          <li key={c.id}>
            <Link href={`${basePath}/${c.id}`} className="block p-3 hover:bg-accent/40">
              <p className="font-medium text-primary">{c.name}</p>
              <p className="text-xs text-muted">{c.groups.map((g) => g.group.name).join(", ")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
