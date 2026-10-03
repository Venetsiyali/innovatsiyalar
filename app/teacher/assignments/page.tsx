import Link from "next/link";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { assignmentStudents } from "@/lib/assignments";
import { formatDateTime } from "@/lib/dates";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function TeacherAssignmentsPage() {
  const session = (await auth())!;
  const live = { deletedAt: null };
  const assignments = await db.assignment.findMany({
    where: { ...live, course: { ...live, teachers: { some: { userId: session.user.id, ...live } } } },
    orderBy: { deadline: "desc" },
    include: {
      course: { select: { name: true } },
      submissions: { where: live, select: { grade: { select: { id: true } } } },
    },
  });
  const totals = await Promise.all(assignments.map((a) => assignmentStudents(a.id).then((s) => s.length)));
  const now = new Date();

  return (
    <>
      <PageHeader title={t("assignments.title")}>
        <Link href="/teacher/assignments/new">
          <Button>
            <Plus className="size-4" />
            {t("assignments.new")}
          </Button>
        </Link>
      </PageHeader>
      {assignments.length === 0 ? (
        <p className="text-muted">{t("assignments.none")}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("assignments.assignmentTitle")}</Th>
              <Th>{t("assignments.course")}</Th>
              <Th>{t("assignments.deadline")}</Th>
              <Th>{t("assignments.status")}</Th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a, i) => {
              const ungraded = a.submissions.filter((s) => !s.grade).length;
              return (
                <tr key={a.id} className="hover:bg-accent/40">
                  <Td>
                    <Link href={`/teacher/assignments/${a.id}`} className="font-medium text-primary hover:underline">{a.title}</Link>
                  </Td>
                  <Td>{a.course.name}</Td>
                  <Td className={a.deadline < now ? "text-muted" : ""}>{formatDateTime(a.deadline)}</Td>
                  <Td>
                    {t("assignments.stats", { submitted: a.submissions.length, total: totals[i], ungraded })}{" "}
                    {ungraded > 0 && <Badge tone="red">{ungraded}</Badge>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
