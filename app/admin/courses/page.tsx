import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const live = { deletedAt: null };
  const courses = await db.course.findMany({
    where: {
      ...live,
      ...(q && { OR: [{ name: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] }),
    },
    orderBy: { name: "asc" },
    include: {
      teachers: { where: live, include: { user: { select: { fullName: true } } } },
      _count: { select: { groups: { where: live } } },
    },
  });

  return (
    <>
      <PageHeader title={t("courses.title")}>
        <Link href="/admin/courses/new">
          <Button>
            <Plus className="size-4" />
            {t("courses.new")}
          </Button>
        </Link>
      </PageHeader>
      <form className="mb-4 flex gap-2">
        <Input name="q" defaultValue={q} placeholder={t("courses.searchPlaceholder")} className="max-w-xs" />
        <Button variant="outline" type="submit">{t("common.search")}</Button>
      </form>
      <Table>
        <thead>
          <tr>
            <Th>{t("common.name")}</Th>
            <Th>{t("courses.language")}</Th>
            <Th>{t("courses.teachers")}</Th>
            <Th className="text-right">{t("courses.groups")}</Th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className="hover:bg-accent/40">
              <Td>
                <Link href={`/admin/courses/${c.id}`} className="font-medium text-primary hover:underline">{c.name}</Link>
                <p className="text-xs text-muted">{c.code}</p>
              </Td>
              <Td>{t(`language.${c.language}`)}</Td>
              <Td className="max-w-md">{[...new Set(c.teachers.map((x) => x.user.fullName))].join(", ") || t("common.none")}</Td>
              <Td className="text-right">{c._count.groups}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-4 text-sm text-muted">{t("common.total", { count: courses.length })}</p>
    </>
  );
}
