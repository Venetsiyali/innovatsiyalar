import { Field } from "@/components/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { t } from "@/lib/i18n";

type Defaults = { fullName?: string; email?: string; role?: string; phone?: string | null };

export function UserFields({ defaults = {} }: { defaults?: Defaults }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={t("users.fullName")} htmlFor="fullName">
        <Input id="fullName" name="fullName" required minLength={2} defaultValue={defaults.fullName} />
      </Field>
      <Field label={t("users.email")} htmlFor="email">
        <Input id="email" name="email" type="email" required defaultValue={defaults.email} />
      </Field>
      <Field label={t("users.role")} htmlFor="role">
        <Select id="role" name="role" defaultValue={defaults.role ?? "STUDENT"}>
          {(["STUDENT", "TEACHER", "ADMIN"] as const).map((r) => (
            <option key={r} value={r}>
              {t(`roles.${r}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("users.phone")} htmlFor="phone">
        <Input id="phone" name="phone" type="tel" placeholder="+998 90 123 45 67" defaultValue={defaults.phone ?? ""} />
      </Field>
    </div>
  );
}
