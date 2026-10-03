import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import {
  activateSemesterAction,
  deleteFacultyAction,
  deleteProgramAction,
  saveFacultyAction,
  saveProgramAction,
  saveSemesterAction,
} from "./actions";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const row = "flex flex-wrap items-start gap-2 space-y-0 [&_input]:w-auto [&_select]:w-auto";

export default async function StructurePage() {
  const live = { deletedAt: null };
  const [faculties, programs, semesters] = await Promise.all([
    db.faculty.findMany({ where: live, orderBy: { name: "asc" } }),
    db.program.findMany({
      where: live,
      orderBy: { name: "asc" },
      include: { _count: { select: { groups: { where: live } } } },
    }),
    db.semester.findMany({ where: live, orderBy: { startDate: "desc" } }),
  ]);

  const facultyOptions = faculties.map((f) => (
    <option key={f.id} value={f.id}>
      {f.name}
    </option>
  ));

  return (
    <>
      <PageHeader title={t("structure.title")} />
      <div className="space-y-6">
        <Card className="space-y-4 p-6">
          <CardTitle>{t("structure.faculties")}</CardTitle>
          {faculties.map((f) => (
            <div key={f.id} className="flex flex-wrap gap-2">
              <ActionForm action={saveFacultyAction.bind(null, f.id)} className={row}>
                <Input name="name" defaultValue={f.name} required className="min-w-64" />
                <Input name="code" defaultValue={f.code} required className="!w-28" />
                <Button type="submit" variant="outline">{t("common.save")}</Button>
              </ActionForm>
              <ActionForm action={deleteFacultyAction.bind(null, f.id)} confirm={t("common.confirmDelete")}>
                <Button type="submit" variant="ghost" className="text-destructive">{t("common.delete")}</Button>
              </ActionForm>
            </div>
          ))}
          <ActionForm action={saveFacultyAction.bind(null, null)} className={row} resetOnSuccess>
            <Input name="name" placeholder={t("structure.newFaculty")} required className="min-w-64" />
            <Input name="code" placeholder={t("common.code")} required className="!w-28" />
            <Button type="submit">{t("common.add")}</Button>
          </ActionForm>
        </Card>

        <Card className="space-y-4 p-6">
          <CardTitle>{t("structure.programs")}</CardTitle>
          {programs.map((p) => (
            <div key={p.id} className="flex flex-wrap items-start gap-2">
              <ActionForm action={saveProgramAction.bind(null, p.id)} className={row}>
                <Input name="name" defaultValue={p.name} required className="min-w-64" />
                <Input name="code" defaultValue={p.code} required className="!w-28" />
                <Select name="facultyId" defaultValue={p.facultyId}>{facultyOptions}</Select>
                <Button type="submit" variant="outline">{t("common.save")}</Button>
              </ActionForm>
              <Badge tone="gray" className="mt-2.5">
                {t("structure.groupsCount")}: {p._count.groups}
              </Badge>
              <ActionForm action={deleteProgramAction.bind(null, p.id)} confirm={t("common.confirmDelete")}>
                <Button type="submit" variant="ghost" className="text-destructive">{t("common.delete")}</Button>
              </ActionForm>
            </div>
          ))}
          <ActionForm action={saveProgramAction.bind(null, null)} className={row} resetOnSuccess>
            <Input name="name" placeholder={t("structure.newProgram")} required className="min-w-64" />
            <Input name="code" placeholder={t("common.code")} required className="!w-28" />
            <Select name="facultyId" required>{facultyOptions}</Select>
            <Button type="submit">{t("common.add")}</Button>
          </ActionForm>
        </Card>

        <Card className="space-y-4 p-6">
          <CardTitle>{t("structure.semesters")}</CardTitle>
          {semesters.map((s) => (
            <div key={s.id} className="flex flex-wrap items-start gap-2">
              <ActionForm action={saveSemesterAction.bind(null, s.id)} className={row}>
                <Input name="name" defaultValue={s.name} required className="min-w-64" />
                <Input name="startDate" type="date" defaultValue={iso(s.startDate)} required aria-label={t("structure.start")} />
                <Input name="endDate" type="date" defaultValue={iso(s.endDate)} required aria-label={t("structure.end")} />
                <Button type="submit" variant="outline">{t("common.save")}</Button>
              </ActionForm>
              {s.isActive ? (
                <Badge tone="green" className="mt-2.5">{t("structure.activeSemester")}</Badge>
              ) : (
                <ActionForm action={activateSemesterAction.bind(null, s.id)}>
                  <Button type="submit" variant="ghost">{t("structure.activate")}</Button>
                </ActionForm>
              )}
            </div>
          ))}
          <ActionForm action={saveSemesterAction.bind(null, null)} className={row} resetOnSuccess>
            <Input name="name" placeholder={t("structure.newSemester")} required className="min-w-64" />
            <Input name="startDate" type="date" required aria-label={t("structure.start")} />
            <Input name="endDate" type="date" required aria-label={t("structure.end")} />
            <Button type="submit">{t("common.add")}</Button>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
