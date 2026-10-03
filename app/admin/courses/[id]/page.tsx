import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { addTeacherAction, deleteCourseAction, removeTeacherAction, saveCourseAction, saveCourseGroupsAction } from "../actions";
import { CourseFields } from "../course-fields";

export default async function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const live = { deletedAt: null };
  const course = await db.course.findFirst({
    where: { id, ...live },
    include: {
      teachers: { where: live, include: { user: { select: { fullName: true } } } },
      groups: { where: live, select: { groupId: true } },
    },
  });
  if (!course) notFound();

  const [teachers, groups] = await Promise.all([
    db.user.findMany({ where: { role: "TEACHER", ...live }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
    db.group.findMany({ where: live, orderBy: [{ shift: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const linked = new Set(course.groups.map((g) => g.groupId));

  return (
    <>
      <PageHeader title={course.name} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <ActionForm action={saveCourseAction.bind(null, course.id)}>
            <CourseFields defaults={course} />
            <Button type="submit">{t("common.save")}</Button>
          </ActionForm>
          <ActionForm action={deleteCourseAction.bind(null, course.id)} confirm={t("common.confirmDelete")}>
            <Button type="submit" variant="outline" className="text-destructive">{t("common.delete")}</Button>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <CardTitle>{t("courses.teachers")}</CardTitle>
            {course.teachers.length === 0 && <p className="text-sm text-muted">{t("courses.noTeachers")}</p>}
            <ul className="space-y-2">
              {course.teachers.map((ct) => (
                <li key={ct.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {ct.user.fullName}{" "}
                    <Badge tone="gray">{t(ct.role === "LECTURE" ? "courses.lecture" : "courses.practice")}</Badge>
                  </span>
                  <ActionForm action={removeTeacherAction.bind(null, ct.id, course.id)}>
                    <Button type="submit" variant="ghost" size="sm" className="text-destructive">{t("common.remove")}</Button>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={addTeacherAction.bind(null, course.id)} className="flex flex-wrap gap-2 space-y-0">
              <Select name="userId" required className="min-w-56 flex-1" defaultValue="">
                <option value="" disabled>{t("courses.addTeacher")}</option>
                {teachers.map((u) => (
                  <option key={u.id} value={u.id}>{u.fullName}</option>
                ))}
              </Select>
              <Select name="role" className="w-48" aria-label={t("courses.teacherRole")}>
                <option value="LECTURE">{t("courses.lecture")}</option>
                <option value="PRACTICE">{t("courses.practice")}</option>
              </Select>
              <Button type="submit">{t("common.add")}</Button>
            </ActionForm>
          </Card>

          <Card className="space-y-3 p-6">
            <CardTitle>{t("courses.groups")}</CardTitle>
            <ActionForm action={saveCourseGroupsAction.bind(null, course.id)}>
              <div className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto rounded-md border border-border p-2 sm:grid-cols-2">
                {groups.map((g) => (
                  <label key={g.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/40">
                    <input type="checkbox" name="groupIds" value={g.id} defaultChecked={linked.has(g.id)} className="size-4" />
                    {g.name}
                  </label>
                ))}
              </div>
              <Button type="submit">{t("courses.saveGroups")}</Button>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
