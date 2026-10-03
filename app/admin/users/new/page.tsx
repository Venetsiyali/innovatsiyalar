import { ActionForm } from "@/components/action-form";
import { Field, PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { db } from "@/lib/db";
import { t } from "@/lib/i18n";
import { createUserAction } from "../actions";
import { UserFields } from "../user-fields";

export default async function NewUserPage() {
  const groups = await db.group.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title={t("users.new")} />
      <Card className="max-w-2xl p-6">
        <ActionForm action={createUserAction} resetOnSuccess>
          <UserFields />
          <Field label={`${t("users.group")} (${t("roles.STUDENT").toLowerCase()})`} htmlFor="groupId">
            <Select id="groupId" name="groupId" defaultValue="">
              <option value="">{t("common.none")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">{t("common.create")}</Button>
        </ActionForm>
      </Card>
    </>
  );
}
