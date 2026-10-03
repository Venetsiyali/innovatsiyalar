import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { addStudentsAction, deleteGroupAction, removeStudentsAction, saveGroupAction } from "../actions";
import { GroupFields } from "../group-fields";

function StudentChecklist({ students }: { students: { id: string; fullName: string; email: string }[] }) {
  return (
    <ul className="max-h-96 divide-y divide-border overflow-y-auto rounded-md border border-border">
      {students.map((s) => (
        <li key={s.id}>
          <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-accent/40">
            <input type="checkbox" name="userIds" value={s.id} className="size-4" />
            <span className="font-medium">{s.fullName}</span>
            <span className="truncate text-muted">{s.email}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

export default async function GroupPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ q?: string }> }) {
  const { id } = await params;
  const { q = "" } = await searchParams;
  const live = { deletedAt: null };
  const group = await db.group.findFirst({
    where: { id, ...live },
    include: {
      enrollments: { where: live, include: { user: { select: { id: true, fullName: true, email: true } } } },
      courseGroups: { where: live, include: { course: { select: { name: true } } } },
      _count: { select: { scheduleSlots: { where: live } } },
    },
  });
  if (!group) notFound();

  // Students with no active enrollment anywhere — candidates for this group.
  const unassigned = await db.user.findMany({
    where: {
      role: "STUDENT",
      ...live,
      enrollments: { none: live },
      ...(q && { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }),
    },
    orderBy: { fullName: "asc" },
    take: 200,
    select: { id: true, fullName: true, email: true },
  });
  const members = group.enrollments.map((e) => e.user).sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <>
      <PageHeader title={group.name} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-6">
          <ActionForm action={saveGroupAction.bind(null, group.id)}>
            <GroupFields defaults={group} />
            <Button type="submit">{t("common.save")}</Button>
          </ActionForm>
          <p className="text-sm text-muted">
            {t("groups.courses")}: {group.courseGroups.map((c) => c.course.name).join(", ") || t("common.none")}
          </p>
          <p className="text-sm text-muted">
            {t("groups.slots")}: {group._count.scheduleSlots}
          </p>
          <ActionForm action={deleteGroupAction.bind(null, group.id)} confirm={t("common.confirmDelete")}>
            <Button type="submit" variant="outline" className="text-destructive">{t("common.delete")}</Button>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3 p-6">
            <CardTitle>
              {t("groups.students")} ({members.length})
            </CardTitle>
            <ActionForm action={removeStudentsAction.bind(null, group.id)}>
              {members.length ? (
                <>
                  <StudentChecklist students={members} />
                  <Button type="submit" variant="outline">{t("groups.removeSelected")}</Button>
                </>
              ) : (
                <p className="text-sm text-muted">{t("groups.noStudents")}</p>
              )}
            </ActionForm>
          </Card>

          <Card className="space-y-3 p-6">
            <CardTitle>{t("groups.addStudents")}</CardTitle>
            <p className="text-sm text-muted">{t("groups.addHint")}</p>
            <form className="flex gap-2">
              <Input name="q" defaultValue={q} placeholder={t("users.searchPlaceholder")} />
              <Button type="submit" variant="outline">{t("common.search")}</Button>
            </form>
            {/* Keep the form mounted so its success message survives the list becoming empty. */}
            <ActionForm action={addStudentsAction.bind(null, group.id)}>
              {unassigned.length ? (
                <>
                  <StudentChecklist students={unassigned} />
                  <Button type="submit">{t("groups.addSelected")}</Button>
                </>
              ) : (
                <p className="text-sm text-muted">{t("groups.unassigned")}</p>
              )}
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
