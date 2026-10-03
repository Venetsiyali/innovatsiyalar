import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { Field, PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { deleteUserAction, mergeTeacherAction, resetPasswordAction, updateUserAction } from "../actions";
import { UserFields } from "../user-fields";

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ merged?: string }>;
}) {
  const { id } = await params;
  const { merged } = await searchParams;
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      teachingCourses: { where: { deletedAt: null }, include: { course: { select: { name: true } } } },
      enrollments: { where: { deletedAt: null }, include: { group: { select: { name: true } } } },
    },
  });
  if (!user) notFound();

  const otherTeachers =
    user.role === "TEACHER"
      ? await db.user.findMany({
          where: { role: "TEACHER", deletedAt: null, id: { not: user.id } },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true },
        })
      : [];
  const courseNames = [...new Set(user.teachingCourses.map((c) => c.course.name))];

  return (
    <>
      <PageHeader title={user.fullName} />
      {merged && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {t("users.mergeDone", { count: merged })}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="p-6">
          <ActionForm action={updateUserAction.bind(null, user.id)}>
            <UserFields defaults={user} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={user.isActive} className="size-4" />
              {t("users.active")}
            </label>
            <Button type="submit">{t("common.save")}</Button>
          </ActionForm>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3 p-6 text-sm">
            {user.role === "TEACHER" && (
              <p>
                <span className="text-muted">{t("users.courses")}:</span> {courseNames.join(", ") || t("common.none")}
              </p>
            )}
            {user.role === "STUDENT" && (
              <p>
                <span className="text-muted">{t("users.enrollments")}:</span>{" "}
                {user.enrollments.map((e) => e.group.name).join(", ") || t("common.none")}
              </p>
            )}
            <p>
              <span className="text-muted">{t("users.lastLogin")}:</span>{" "}
              {user.lastLoginAt?.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" }) ?? t("common.none")}
            </p>
            <ActionForm action={resetPasswordAction.bind(null, user.id)} confirm={t("users.resetConfirm")}>
              <Button type="submit" variant="outline" className="w-full">
                {t("users.resetPassword")}
              </Button>
            </ActionForm>
            <ActionForm action={deleteUserAction.bind(null, user.id)} confirm={t("common.confirmDelete")}>
              <Button type="submit" variant="outline" className="w-full text-destructive">
                {t("common.delete")}
              </Button>
            </ActionForm>
          </Card>

          {user.role === "TEACHER" && (
            <Card className="space-y-3 p-6">
              <CardTitle className="text-base">{t("users.merge")}</CardTitle>
              <p className="text-sm text-muted">{t("users.mergeHint")}</p>
              <ActionForm action={mergeTeacherAction.bind(null, user.id)} confirm={t("users.mergeConfirm")}>
                <Field label={t("users.mergeInto")} htmlFor="targetId">
                  <Select id="targetId" name="targetId" required defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {otherTeachers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Button type="submit" variant="outline" className="w-full">
                  {t("users.merge")}
                </Button>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
