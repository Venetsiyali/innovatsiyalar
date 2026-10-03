import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { saveGroupAction } from "../actions";
import { GroupFields } from "../group-fields";

export default function NewGroupPage() {
  return (
    <>
      <PageHeader title={t("groups.new")} />
      <Card className="max-w-2xl p-6">
        <ActionForm action={saveGroupAction.bind(null, null)}>
          <GroupFields />
          <Button type="submit">{t("common.create")}</Button>
        </ActionForm>
      </Card>
    </>
  );
}
