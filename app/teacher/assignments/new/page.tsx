import { forbidden } from "next/navigation";
import { auth } from "@/auth";
import { AssignmentForm } from "@/components/assignment-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { canManageCourse } from "@/lib/course-access";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function NewAssignmentPage({ searchParams }: { searchParams: Promise<{ courseId?: string }> }) {
  const { courseId } = await searchParams;
  const session = (await auth())!;
  const live = { deletedAt: null };

  if (!courseId) {
    const courses = await db.course.findMany({
      where: { ...live, semester: { isActive: true }, teachers: { some: { userId: session.user.id, ...live } } },
      orderBy: { name: "asc" },
    });
    return (
      <>
        <PageHeader title={t("assignments.new")} />
        <Card className="max-w-xl p-6">
          <form className="space-y-3">
            <p className="text-sm text-muted">{t("assignments.chooseCourse")}</p>
            <Select name="courseId" required>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Button type="submit">{t("assignments.next")}</Button>
          </form>
        </Card>
      </>
    );
  }

  if (!(await canManageCourse(session.user, courseId))) forbidden();
  const course = await db.course.findFirst({ where: { id: courseId, ...live } });
  return (
    <>
      <PageHeader title={`${t("assignments.new")}: ${course?.name ?? ""}`} />
      <Card className="max-w-3xl p-6">
        <AssignmentForm courseId={courseId} />
      </Card>
    </>
  );
}
