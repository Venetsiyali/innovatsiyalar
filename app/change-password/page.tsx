import { KeyRound } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { changePasswordAction } from "./actions";

export default function ChangePasswordPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <KeyRound className="size-6 text-primary" />
          <CardTitle>{t("password.title")}</CardTitle>
          <p className="text-sm text-muted">{t("password.subtitle")}</p>
        </CardHeader>
        <CardContent>
          <ActionForm action={changePasswordAction}>
            <Field label={t("password.current")} htmlFor="current">
              <Input id="current" name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label={t("password.new")} htmlFor="next">
              <Input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field label={t("password.confirm")} htmlFor="confirm">
              <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Button type="submit" className="w-full">
              {t("common.save")}
            </Button>
          </ActionForm>
        </CardContent>
      </Card>
    </main>
  );
}
