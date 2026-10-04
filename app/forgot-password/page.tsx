import { ActionForm } from "@/components/action-form";
import { AuthCard } from "@/components/auth-card";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { requestResetAction } from "./actions";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title={t("forgot.title")} subtitle={t("forgot.subtitle")}>
      <ActionForm action={requestResetAction}>
        <Field label={t("auth.email")} htmlFor="email">
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Button type="submit" className="w-full">{t("forgot.submit")}</Button>
      </ActionForm>
    </AuthCard>
  );
}
