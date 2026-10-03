import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";

type Defaults = {
  name?: string;
  code?: string;
  credits?: number;
  semesterId?: string;
  language?: string;
  weightCurrent?: number;
  weightMidterm?: number;
  weightFinal?: number;
};

export async function CourseFields({ defaults = {} }: { defaults?: Defaults }) {
  const semesters = await db.semester.findMany({ where: { deletedAt: null }, orderBy: { startDate: "desc" } });
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("common.name")} htmlFor="name">
          <Input id="name" name="name" required defaultValue={defaults.name} />
        </Field>
        <Field label={t("common.code")} htmlFor="code">
          <Input id="code" name="code" required defaultValue={defaults.code} />
        </Field>
        <Field label={t("courses.credits")} htmlFor="credits">
          <Input id="credits" name="credits" type="number" min={0} max={30} defaultValue={defaults.credits ?? 0} />
        </Field>
        <Field label={t("courses.semester")} htmlFor="semesterId">
          <Select id="semesterId" name="semesterId" defaultValue={defaults.semesterId ?? semesters.find((s) => s.isActive)?.id}>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("courses.language")} htmlFor="language">
          <Select id="language" name="language" defaultValue={defaults.language ?? "UZ"}>
            {(["UZ", "RU", "EN"] as const).map((l) => (
              <option key={l} value={l}>{t(`language.${l}`)}</option>
            ))}
          </Select>
        </Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{t("courses.weights")}</legend>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              ["weightCurrent", "courses.current", 40],
              ["weightMidterm", "courses.midterm", 30],
              ["weightFinal", "courses.final", 30],
            ] as const
          ).map(([name, label, fallback]) => (
            <Field key={name} label={t(label)} htmlFor={name}>
              <Input id={name} name={name} type="number" min={0} max={100} defaultValue={defaults[name] ?? fallback} />
            </Field>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
