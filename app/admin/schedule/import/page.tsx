import { PageHeader } from "@/components/field";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { importScheduleAction } from "../actions";
import { ScheduleImportForm } from "./import-form";

export const maxDuration = 300;

export default function ScheduleImportPage() {
  return (
    <>
      <PageHeader title={t("schedule.import")} />
      <Card className="max-w-3xl space-y-4 p-6">
        <p className="text-sm text-muted">{t("schedule.importHelp")}</p>
        <ScheduleImportForm
          action={importScheduleAction}
          labels={{ submit: t("import.submit"), conflicts: t("schedule.importConflicts") }}
        />
      </Card>
    </>
  );
}
