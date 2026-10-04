import { ActionForm } from "@/components/action-form";
import { AuthCard } from "@/components/auth-card";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { resetPasswordAction } from "../forgot-password/actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <AuthCard title={t("forgot.newTitle")}>
      {/^[a-f0-9]{64}$/.test(token) ? (
        <ActionForm action={resetPasswordAction.bind(null, token)}>
          <Field label={t("password.new")} htmlFor="password">
            <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
          </Field>
          <Field label={t("password.confirm")} htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" minLength={8} required autoComplete="new-password" />
          </Field>
          <Button type="submit" className="w-full">{t("common.save")}</Button>
        </ActionForm>
      ) : (
        <p className="text-sm text-destructive">{t("forgot.invalid")}</p>
      )}
    </AuthCard>
  );
}
