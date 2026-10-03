import { PageHeader } from "@/components/field";
import { Card } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import { importUsersAction } from "../actions";
import { ImportForm } from "./import-form";

// bcrypt-hashing hundreds of passwords takes a while on serverless.
export const maxDuration = 300;

export default function ImportUsersPage() {
  return (
    <>
      <PageHeader title={t("import.title")} />
      <Card className="max-w-3xl space-y-4 p-6">
        <p className="text-sm text-muted">{t("import.help")}</p>
        <ImportForm
          action={importUsersAction}
          labels={{
            file: t("import.file"),
            submit: t("import.submit"),
            credentials: t("import.credentials"),
            downloadCsv: t("import.downloadCsv"),
            roles: { ADMIN: t("roles.ADMIN"), TEACHER: t("roles.TEACHER"), STUDENT: t("roles.STUDENT") },
          }}
        />
      </Card>
    </>
  );
}
