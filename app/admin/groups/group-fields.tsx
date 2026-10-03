import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

type Defaults = { name?: string; programId?: string; semesterId?: string; year?: number; shift?: string; language?: string };

export async function GroupFields({ defaults = {} }: { defaults?: Defaults }) {
  const live = { deletedAt: null };
  const [programs, semesters] = await Promise.all([
    db.program.findMany({ where: live, orderBy: { name: "asc" } }),
    db.semester.findMany({ where: live, orderBy: { startDate: "desc" } }),
  ]);
  const activeSemester = semesters.find((s) => s.isActive)?.id;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("common.name")} htmlFor="name">
        <Input id="name" name="name" required defaultValue={defaults.name} placeholder="26-01 Yuris" />
      </Field>
      <Field label={t("groups.program")} htmlFor="programId">
        <Select id="programId" name="programId" required defaultValue={defaults.programId}>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("groups.semester")} htmlFor="semesterId">
        <Select id="semesterId" name="semesterId" required defaultValue={defaults.semesterId ?? activeSemester}>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </Field>
      <Field label={t("groups.year")} htmlFor="year">
        <Input id="year" name="year" type="number" min={1} max={6} defaultValue={defaults.year ?? 1} />
      </Field>
      <Field label={t("groups.shift")} htmlFor="shift">
        <Select id="shift" name="shift" defaultValue={defaults.shift ?? "KUNDUZGI"}>
          <option value="KUNDUZGI">{t("shift.KUNDUZGI")}</option>
          <option value="KECHKI">{t("shift.KECHKI")}</option>
        </Select>
      </Field>
      <Field label={t("groups.language")} htmlFor="language">
        <Select id="language" name="language" defaultValue={defaults.language ?? "UZ"}>
          {(["UZ", "RU", "EN"] as const).map((l) => (
            <option key={l} value={l}>{t(`language.${l}`)}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
