import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { auth } from "@/auth";
import { CourseContent } from "@/components/course-content";
import { PageHeader } from "@/components/field";
import { Card } from "@/components/ui/card";
import { canManageCourse, canViewCourse } from "@/lib/course-access";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

const live = { deletedAt: null };

/** Course card grid for "my courses" (teacher) and "courses" (student). */
export async function CourseList({ basePath }: { basePath: string }) {
  const session = (await auth())!;
  const { id, role } = session.user;
  const courses = await db.course.findMany({
    where: {
      ...live,
      semester: { isActive: true },
      ...(role === "TEACHER"
        ? { teachers: { some: { userId: id, ...live } } }
        : { groups: { some: { ...live, group: { ...live, enrollments: { some: { userId: id, ...live, status: "ACTIVE" } } } } } }),
    },
    orderBy: { name: "asc" },
    include: {
      teachers: { where: live, include: { user: { select: { fullName: true } } } },
      groups: { where: live, include: { group: { select: { name: true } } } },
      _count: { select: { modules: { where: live } } },
    },
  });

  return (
    <>
      <PageHeader title={t(role === "TEACHER" ? "content.myCourses" : "nav.courses")} />
      {courses.length === 0 && <p className="text-muted">{t("content.noCourses")}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Link key={c.id} href={`${basePath}/${c.id}`}>
            <Card className="h-full space-y-2 p-4 transition-colors hover:border-primary">
              <p className="font-semibold">{c.name}</p>
              <p className="text-xs text-muted">
                {role === "TEACHER"
                  ? c.groups.map((g) => g.group.name).join(", ")
                  : [...new Set(c.teachers.map((x) => x.user.fullName))].join(", ")}
              </p>
              <p className="text-xs text-muted">
                {t("content.modules")}: {c._count.modules}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

/** Course page with ownership checks enforced on the server (403 otherwise). */
export async function CoursePage({ courseId, manage }: { courseId: string; manage: boolean }) {
  const session = (await auth())!;
  const allowed = manage ? await canManageCourse(session.user, courseId) : await canViewCourse(session.user, courseId);
  if (!allowed) forbidden();

  const course = await db.course.findFirst({
    where: { id: courseId, ...live },
    include: {
      teachers: { where: live, include: { user: { select: { fullName: true } } } },
      groups: { where: live, include: { group: { select: { name: true } } } },
    },
  });
  if (!course) notFound();

  return (
    <>
      <PageHeader title={course.name} />
      <div className="mb-4 space-y-1 text-sm text-muted">
        <p>
          {t("content.teachers")}: {[...new Set(course.teachers.map((x) => x.user.fullName))].join(", ") || t("common.none")}
        </p>
        {manage && (
          <p>
            {t("content.groups")}: {course.groups.map((g) => g.group.name).join(", ") || t("common.none")}
          </p>
        )}
      </div>
      <CourseContent
        courseId={course.id}
        canManage={manage}
        assignmentHref={session.user.role === "TEACHER" ? "/teacher/assignments" : session.user.role === "STUDENT" ? "/student/assignments" : undefined}
        studentId={session.user.role === "STUDENT" ? session.user.id : undefined}
      />
    </>
  );
}
