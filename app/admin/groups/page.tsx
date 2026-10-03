import type { Prisma, Shift } from "@prisma/client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, Td, Th } from "@/components/ui/table";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ shift?: string; program?: string }> }) {
  const { shift = "", program = "" } = await searchParams;
  const live = { deletedAt: null };
  const where: Prisma.GroupWhereInput = {
    ...live,
    ...((shift === "KUNDUZGI" || shift === "KECHKI") && { shift: shift as Shift }),
    ...(program && { programId: program }),
  };
  const [groups, programs] = await Promise.all([
    db.group.findMany({
      where,
      orderBy: [{ shift: "asc" }, { name: "asc" }],
      include: {
        program: { select: { name: true } },
        _count: { select: { enrollments: { where: live }, courseGroups: { where: live } } },
      },
    }),
    db.program.findMany({ where: live, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader title={t("groups.title")}>
        <Link href="/admin/groups/new">
          <Button>
            <Plus className="size-4" />
            {t("groups.new")}
          </Button>
        </Link>
      </PageHeader>
      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="shift" defaultValue={shift} className="w-40">
          <option value="">{t("common.all")}</option>
          <option value="KUNDUZGI">{t("shift.KUNDUZGI")}</option>
          <option value="KECHKI">{t("shift.KECHKI")}</option>
        </Select>
        <Select name="program" defaultValue={program} className="w-64">
          <option value="">{t("common.all")}</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Button variant="outline" type="submit">{t("common.filter")}</Button>
      </form>
      <Table>
        <thead>
          <tr>
            <Th>{t("common.name")}</Th>
            <Th>{t("groups.program")}</Th>
            <Th>{t("groups.shift")}</Th>
            <Th>{t("groups.language")}</Th>
            <Th className="text-right">{t("groups.students")}</Th>
            <Th className="text-right">{t("groups.courses")}</Th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="hover:bg-accent/40">
              <Td>
                <Link href={`/admin/groups/${g.id}`} className="font-medium text-primary hover:underline">{g.name}</Link>
              </Td>
              <Td>{g.program.name}</Td>
              <Td>{t(`shift.${g.shift}`)}</Td>
              <Td>{t(`language.${g.language}`)}</Td>
              <Td className="text-right">{g._count.enrollments}</Td>
              <Td className="text-right">{g._count.courseGroups}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-4 text-sm text-muted">{t("common.total", { count: groups.length })}</p>
    </>
  );
}
